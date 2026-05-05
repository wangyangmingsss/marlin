use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{Merchant, SubscriptionPlan};

#[derive(Accounts)]
pub struct SetPlanActive<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"merchant", authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ MarlinError::Unauthorized,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        mut,
        seeds = [b"plan", merchant.key().as_ref(), plan.plan_id.as_ref()],
        bump = plan.bump,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub plan: Account<'info, SubscriptionPlan>,
}

pub fn handler(ctx: Context<SetPlanActive>, active: bool) -> Result<()> {
    ctx.accounts.plan.active = active;
    Ok(())
}
