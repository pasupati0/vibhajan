use crate::balances::PaymentStatus;
use crate::money::Paise;
use crate::validation::DomainError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettlementRecord {
    pub settlement_id: String,
    pub expense_id: Option<String>,
    pub from_participant_id: String,
    pub to_participant_id: String,
    pub amount_paise: Paise,
    pub payment_method: String,
    pub recorded_at_epoch_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OutstandingComputation {
    pub allocated_share: Paise,
    pub original_contribution: Paise,
    pub previous_settled_paise: Paise,
    pub new_payment_paise: Paise,
    pub remaining_outstanding: Paise,
    pub updated_status: PaymentStatus,
}

/// Validates and computes the impact of a full or partial payment against a participant's outstanding balance.
pub fn calculate_outstanding_amount(
    allocated_share: Paise,
    original_contribution: Paise,
    previous_settled_paise: Paise,
    new_payment_paise: Paise,
) -> Result<OutstandingComputation, DomainError> {
    if allocated_share.is_negative() || original_contribution.is_negative() {
        return Err(DomainError::InvalidAmount(
            "Allocated share and original contribution cannot be negative".into(),
        ));
    }
    if new_payment_paise.0 < 0 {
        return Err(DomainError::InvalidAmount(
            "Payment amount cannot be negative".into(),
        ));
    }

    let current_due = (allocated_share - original_contribution - previous_settled_paise).max(Paise::ZERO);
    if new_payment_paise > current_due {
        return Err(DomainError::SettlementExceedsOutstanding {
            outstanding: current_due,
            attempted_payment: new_payment_paise,
        });
    }

    let total_settled = previous_settled_paise + new_payment_paise;
    let remaining = (allocated_share - original_contribution - total_settled).max(Paise::ZERO);

    let updated_status = if remaining.is_zero() {
        PaymentStatus::Paid
    } else if original_contribution.0 > 0 || total_settled.0 > 0 {
        PaymentStatus::PartiallyPaid
    } else {
        PaymentStatus::Unpaid
    };

    Ok(OutstandingComputation {
        allocated_share,
        original_contribution,
        previous_settled_paise,
        new_payment_paise,
        remaining_outstanding: remaining,
        updated_status,
    })
}

pub fn record_settlement(
    current_outstanding: Paise,
    payment_paise: Paise,
) -> Result<(Paise, PaymentStatus), DomainError> {
    let comp = calculate_outstanding_amount(
        current_outstanding,
        Paise::ZERO,
        Paise::ZERO,
        payment_paise,
    )?;
    Ok((comp.remaining_outstanding, comp.updated_status))
}