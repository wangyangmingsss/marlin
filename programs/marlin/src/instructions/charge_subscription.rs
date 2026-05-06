use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::MarlinError;
use crate::state::{Merchant, Subscription, SubscriptionPlan, SubscriptionStatus};
use crate::{PROTOCOL_FEE_BPS, BPS_DENOMINATOR, PROTOCOL_FEE_RECEIVER};

#[event]
pub struct SubscriptionCharged {
    pub subscription: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub mint: Pubkey,
    pub charges_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionFailed {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub customer: Pubkey,
    pub consecutive_failures: u32,
    pub attempted_amount: u64,
    pub failed_at: i64,
    pub reason: u8,
}

#[derive(Accounts)]
pub struct ChargeSubscription<'info> {
    /// Anyone can crank this instruction.
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"merchant", merchant.authority.as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        seeds = [b"plan", merchant.key().as_ref(), plan.plan_id.as_ref()],
        bump = plan.bump,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub plan: Account<'info, SubscriptionPlan>,

    #[account(
        mut,
        seeds = [b"sub", plan.key().as_ref(), subscription.customer.as_ref()],
        bump = subscription.bump,
        has_one = plan @ MarlinError::MintMismatch,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub subscription: Account<'info, Subscription>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = customer_token_account.key() == subscription.customer_token_account @ MarlinError::MintMismatch,
        constraint = customer_token_account.mint == plan.mint @ MarlinError::MintMismatch,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    /// CHECK: The merchant's authority wallet, used to derive merchant ATA.
    #[account(
        constraint = merchant_authority.key() == merchant.authority @ MarlinError::Unauthorized,
    )]
    pub merchant_authority: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = mint,
        associated_token::authority = merchant_authority,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// CHECK: Protocol fee receiver address, validated against constant.
    #[account(
        constraint = protocol_fee_receiver.key() == PROTOCOL_FEE_RECEIVER @ MarlinError::Unauthorized,
    )]
    pub protocol_fee_receiver: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = mint,
        associated_token::authority = protocol_fee_receiver,
    )]
    pub protocol_fee_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ChargeSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let plan = &ctx.accounts.plan;

    // Validate status
    require!(
        subscription.status == SubscriptionStatus::Active as u8,
        MarlinError::SubscriptionNotActive
    );

    // Validate timing
    let now = Clock::get()?.unix_timestamp;
    require!(now >= subscription.next_charge_at, MarlinError::NotYetDue);

    let amount = plan.amount_per_period;

    // Validate max authorized
    require!(
        subscription
            .total_charged
            .checked_add(amount)
            .unwrap()
            <= subscription.max_total_authorized,
        MarlinError::MaxAuthorizedExceeded
    );

    let fee = amount
        .checked_mul(PROTOCOL_FEE_BPS)
        .unwrap()
        .checked_div(BPS_DENOMINATOR)
        .unwrap();
    let merchant_amount = amount.checked_sub(fee).unwrap();

    // Build signer seeds for subscription PDA
    let plan_key = plan.key();
    let customer_key = subscription.customer;
    let bump = subscription.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"sub",
        plan_key.as_ref(),
        customer_key.as_ref(),
        &[bump],
    ]];

    // CPI transfer: customer ATA -> merchant ATA (merchant_amount)
    let transfer_to_merchant_ix = spl_token::instruction::transfer(
        ctx.accounts.token_program.key,
        &ctx.accounts.customer_token_account.key(),
        &ctx.accounts.merchant_token_account.key(),
        &ctx.accounts.subscription.key(),
        &[],
        merchant_amount,
    )?;

    let merchant_result = invoke_signed(
        &transfer_to_merchant_ix,
        &[
            ctx.accounts.customer_token_account.to_account_info(),
            ctx.accounts.merchant_token_account.to_account_info(),
            ctx.accounts.subscription.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer_seeds,
    );

    if merchant_result.is_err() {
        // Mark as failed — do NOT propagate error. The transaction must
        // succeed so the state change commits and the cron can move on.
        msg!("Charge failed: customer->merchant transfer error");

        let sub = &mut ctx.accounts.subscription;
        sub.status = SubscriptionStatus::Failed as u8;
        sub.consecutive_failures = sub.consecutive_failures.saturating_add(1);
        sub.last_failure_at = now;

        emit!(SubscriptionFailed {
            subscription: sub.key(),
            plan: plan.key(),
            customer: sub.customer,
            consecutive_failures: sub.consecutive_failures,
            attempted_amount: amount,
            failed_at: now,
            reason: 1, // merchant transfer failed (e.g. insufficient funds, revoked delegate)
        });

        // CRITICAL: return Ok(()) so the transaction succeeds and state commits.
        return Ok(());
    }

    // CPI transfer: customer ATA -> protocol fee ATA (fee)
    if fee > 0 {
        let transfer_fee_ix = spl_token::instruction::transfer(
            ctx.accounts.token_program.key,
            &ctx.accounts.customer_token_account.key(),
            &ctx.accounts.protocol_fee_token_account.key(),
            &ctx.accounts.subscription.key(),
            &[],
            fee,
        )?;

        let fee_result = invoke_signed(
            &transfer_fee_ix,
            &[
                ctx.accounts.customer_token_account.to_account_info(),
                ctx.accounts.protocol_fee_token_account.to_account_info(),
                ctx.accounts.subscription.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            signer_seeds,
        );

        if fee_result.is_err() {
            // Fee transfer failed after merchant was already paid.
            // Record failure but note: merchant DID receive funds.
            msg!("Charge partial failure: merchant paid but protocol fee transfer failed");

            let sub = &mut ctx.accounts.subscription;
            sub.status = SubscriptionStatus::Failed as u8;
            sub.consecutive_failures = sub.consecutive_failures.saturating_add(1);
            sub.last_failure_at = now;

            emit!(SubscriptionFailed {
                subscription: sub.key(),
                plan: plan.key(),
                customer: sub.customer,
                consecutive_failures: sub.consecutive_failures,
                attempted_amount: amount,
                failed_at: now,
                reason: 2, // protocol fee transfer failed
            });

            return Ok(());
        }
    }

    // Update subscription state
    let sub = &mut ctx.accounts.subscription;
    sub.next_charge_at = now + plan.period_seconds as i64;
    sub.charges_count = sub.charges_count.checked_add(1).unwrap();
    sub.total_charged = sub.total_charged.checked_add(amount).unwrap();
    sub.consecutive_failures = 0; // Reset on successful charge

    // Update merchant volume
    let merchant = &mut ctx.accounts.merchant;
    merchant.total_volume = merchant.total_volume.checked_add(amount).unwrap();

    emit!(SubscriptionCharged {
        subscription: sub.key(),
        merchant: merchant.key(),
        amount,
        fee,
        mint: ctx.accounts.mint.key(),
        charges_count: sub.charges_count,
        timestamp: now,
    });

    Ok(())
}
