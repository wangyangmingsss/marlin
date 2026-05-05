use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{Merchant, SubscriptionPlan};
use crate::{is_supported_mint, MIN_PERIOD_SECONDS};

#[derive(Accounts)]
#[instruction(plan_id: [u8; 16])]
pub struct CreateSubscriptionPlan<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"merchant", authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ MarlinError::Unauthorized,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        init,
        payer = authority,
        space = SubscriptionPlan::LEN,
        seeds = [b"plan", merchant.key().as_ref(), plan_id.as_ref()],
        bump,
    )]
    pub plan: Account<'info, SubscriptionPlan>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateSubscriptionPlan>,
    plan_id: [u8; 16],
    name: [u8; 64],
    amount_per_period: u64,
    mint: Pubkey,
    period_seconds: u32,
    trial_seconds: u32,
) -> Result<()> {
    require!(amount_per_period > 0, MarlinError::InvalidAmount);
    require!(
        period_seconds >= MIN_PERIOD_SECONDS,
        MarlinError::PeriodTooShort
    );
    require!(is_supported_mint(&mint), MarlinError::MintNotSupported);

    let plan = &mut ctx.accounts.plan;
    plan.merchant = ctx.accounts.merchant.key();
    plan.plan_id = plan_id;
    plan.name = name;
    plan.amount_per_period = amount_per_period;
    plan.mint = mint;
    plan.period_seconds = period_seconds;
    plan.trial_seconds = trial_seconds;
    plan.active = true;
    plan.bump = ctx.bumps.plan;
    plan._reserved = [0u8; 64];

    Ok(())
}
