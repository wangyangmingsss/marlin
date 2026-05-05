use anchor_lang::prelude::*;

#[error_code]
pub enum MarlinError {
    #[msg("Mint is not in the supported allowlist")]
    MintNotSupported,
    #[msg("Display name must not be empty")]
    InvalidDisplayName,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Due date must be in the future or zero")]
    InvalidDueDate,
    #[msg("Invoice is not in Open status")]
    InvoiceNotOpen,
    #[msg("Invoice has expired")]
    InvoiceExpired,
    #[msg("Payer does not match the invoice customer wallet")]
    WrongPayer,
    #[msg("Mint does not match the expected mint")]
    MintMismatch,
    #[msg("Token account owner mismatch")]
    WrongOwner,
    #[msg("Unauthorized: signer is not the authority")]
    Unauthorized,
    #[msg("Subscription is not in Active status")]
    SubscriptionNotActive,
    #[msg("Subscription is not yet due for charge")]
    NotYetDue,
    #[msg("Charge would exceed max total authorized amount")]
    MaxAuthorizedExceeded,
    #[msg("Subscription period must be at least 86400 seconds (1 day)")]
    PeriodTooShort,
    #[msg("Subscription plan is not active")]
    PlanInactive,
    #[msg("Max authorized amount must be at least one period amount")]
    InsufficientAuthorization,
    #[msg("Token transfer CPI failed during charge")]
    ChargeFailed,
}
