use crate::balances::{ExpenseRecordInput, PayerContribution};
use crate::money::Paise;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DomainError {
    #[error("Invalid monetary amount: {0}")]
    InvalidAmount(String),
    #[error("Invalid GST rate: {0}")]
    InvalidGstRate(String),
    #[error("At least one participant is required")]
    EmptyParticipants,
    #[error("Invalid percentage: {0}")]
    InvalidPercentage(String),
    #[error("Percentages must sum to 100.00% ({expected_bps} bps), but got {actual_bps} bps")]
    PercentageSumMismatch { expected_bps: u32, actual_bps: u32 },
    #[error("Participant {0} has a negative allocation")]
    NegativeAllocation(String),
    #[error("Allocated total ({allocated_total}) exceeds bill total ({bill_total})")]
    OverAllocation {
        bill_total: Paise,
        allocated_total: Paise,
    },
    #[error("Allocated shares ({allocated_total}) do not reconcile with bill total ({bill_total})")]
    AllocationTotalMismatch {
        bill_total: Paise,
        allocated_total: Paise,
    },
    #[error("Original payer contributions ({contributed_total}) do not equal bill total ({bill_total})")]
    ContributionTotalMismatch {
        bill_total: Paise,
        contributed_total: Paise,
    },
    #[error("Settlement payment ({attempted_payment}) exceeds remaining due ({outstanding})")]
    SettlementExceedsOutstanding {
        outstanding: Paise,
        attempted_payment: Paise,
    },
    #[error("Invalid Indian mobile number: {0}")]
    InvalidPhoneNumber(String),
    #[error("Invalid UPI VPA handle: {0}")]
    InvalidUpiId(String),
}

pub fn validate_expense(expense: &ExpenseRecordInput) -> Result<(), DomainError> {
    if expense.total_bill.0 <= 0 {
        return Err(DomainError::InvalidAmount(
            "Bill total must be strictly positive".into(),
        ));
    }
    if expense.allocations.is_empty() {
        return Err(DomainError::EmptyParticipants);
    }

    let mut alloc_sum = Paise::ZERO;
    for (pid, amt) in &expense.allocations {
        if amt.is_negative() {
            return Err(DomainError::NegativeAllocation(pid.clone()));
        }
        alloc_sum += *amt;
    }

    if alloc_sum != expense.total_bill {
        return Err(DomainError::AllocationTotalMismatch {
            bill_total: expense.total_bill,
            allocated_total: alloc_sum,
        });
    }

    let mut contrib_sum = Paise::ZERO;
    for PayerContribution {
        participant_id,
        contributed_paise,
    } in &expense.original_contributions
    {
        if contributed_paise.is_negative() {
            return Err(DomainError::NegativeAllocation(participant_id.clone()));
        }
        contrib_sum += *contributed_paise;
    }

    if contrib_sum != expense.total_bill {
        return Err(DomainError::ContributionTotalMismatch {
            bill_total: expense.total_bill,
            contributed_total: contrib_sum,
        });
    }

    Ok(())
}

/// Validates Indian +91 phone numbers and normalizes to `+91XXXXXXXXXX`.
pub fn validate_indian_phone(raw: &str) -> Result<String, DomainError> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let ten_digits = if digits.len() == 10 {
        &digits[..]
    } else if digits.len() == 12 && digits.starts_with("91") {
        &digits[2..]
    } else if digits.len() == 11 && digits.starts_with('0') {
        &digits[1..]
    } else {
        return Err(DomainError::InvalidPhoneNumber(raw.to_string()));
    };

    let first = ten_digits.chars().next().unwrap_or('0');
    if !matches!(first, '6' | '7' | '8' | '9') {
        return Err(DomainError::InvalidPhoneNumber(raw.to_string()));
    }

    Ok(format!("+91{}", ten_digits))
}

/// Validates standard NPCI UPI Virtual Payment Address (`username@bankhandle`).
pub fn validate_upi_id(raw: &str) -> Result<String, DomainError> {
    let trimmed = raw.trim().to_lowercase();
    let parts: Vec<&str> = trimmed.split('@').collect();
    if parts.len() != 2 {
        return Err(DomainError::InvalidUpiId(raw.to_string()));
    }
    let user = parts[0];
    let handle = parts[1];
    if user.len() < 2
        || handle.len() < 2
        || !user
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        || !handle.chars().all(|c| c.is_ascii_alphanumeric())
    {
        return Err(DomainError::InvalidUpiId(raw.to_string()));
    }
    Ok(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::balances::{calculate_expense_balances, calculate_group_balances};
    use crate::gst::{calculate_gst, GstCalculationInput, GstMode, TaxStructure};
    use crate::money::{BasisPoints, Paise};
    use crate::settlements::{calculate_outstanding_amount, SettlementRecord};
    use crate::splitting::{
        split_by_amount, split_by_percentage, split_equally, ParticipantShareInput,
    };

    #[test]
    fn test_scenario_a_gst_inclusive_1180_at_18_percent_and_40_35_25_split() {
        // Scenario A: ₹1,180.00 (118,000 paise) inclusive of 18% GST (1,800 bps)
        let gst_res = calculate_gst(&GstCalculationInput {
            entered_amount: Paise(118_000),
            gst_rate_bps: BasisPoints(1_800),
            mode: GstMode::Inclusive,
            tax_structure: TaxStructure::CgstSgst,
        })
        .expect("GST calculation must succeed");

        assert_eq!(gst_res.taxable_amount, Paise(100_000)); // ₹1,000.00
        assert_eq!(gst_res.total_gst, Paise(18_000)); // ₹180.00
        assert_eq!(gst_res.cgst_amount, Paise(9_000)); // ₹90.00
        assert_eq!(gst_res.sgst_amount, Paise(9_000)); // ₹90.00
        assert_eq!(gst_res.gross_total, Paise(118_000));

        // 40%, 35%, 25% split across 3 participants
        let split_res = split_by_percentage(
            gst_res.gross_total,
            &[
                ParticipantShareInput {
                    participant_id: "aarav".into(),
                    percentage_bps: Some(BasisPoints(4_000)),
                    custom_amount: None,
                    is_locked: false,
                },
                ParticipantShareInput {
                    participant_id: "priya".into(),
                    percentage_bps: Some(BasisPoints(3_500)),
                    custom_amount: None,
                    is_locked: false,
                },
                ParticipantShareInput {
                    participant_id: "rohan".into(),
                    percentage_bps: Some(BasisPoints(2_500)),
                    custom_amount: None,
                    is_locked: false,
                },
            ],
        )
        .expect("Percentage split must succeed");

        assert_eq!(split_res.allocations[0].allocated_paise, Paise(47_200)); // ₹472.00
        assert_eq!(split_res.allocations[1].allocated_paise, Paise(41_300)); // ₹413.00
        assert_eq!(split_res.allocations[2].allocated_paise, Paise(29_500)); // ₹295.00
        assert!(split_res.is_reconciled);
    }

    #[test]
    fn test_equal_split_largest_remainder_paise_reconciliation() {
        // ₹100.00 (10,000 paise) split 3 ways -> 3334, 3333, 3333 paise
        let res = split_equally(
            Paise(10_000),
            &["p1".to_string(), "p2".to_string(), "p3".to_string()],
        )
        .unwrap();
        assert_eq!(res.allocations[0].allocated_paise, Paise(3_334));
        assert_eq!(res.allocations[1].allocated_paise, Paise(3_333));
        assert_eq!(res.allocations[2].allocated_paise, Paise(3_333));
        let sum: i64 = res.allocations.iter().map(|a| a.allocated_paise.0).sum();
        assert_eq!(sum, 10_000);
    }

    #[test]
    fn test_scenario_b_and_c_reconciliation_and_partial_settlements() {
        // Bill of ₹1,180.00: Aarav is edited & locked to ₹500.00 (50,000 paise),
        // Priya and Rohan auto-reconcile the remaining ₹680.00 (34,000 paise each).
        let edited = split_by_amount(
            Paise(118_000),
            &[
                ParticipantShareInput {
                    participant_id: "aarav".into(),
                    percentage_bps: None,
                    custom_amount: Some(Paise(50_000)),
                    is_locked: true,
                },
                ParticipantShareInput {
                    participant_id: "priya".into(),
                    percentage_bps: None,
                    custom_amount: None,
                    is_locked: false,
                },
                ParticipantShareInput {
                    participant_id: "rohan".into(),
                    percentage_bps: None,
                    custom_amount: None,
                    is_locked: false,
                },
            ],
            true,
        )
        .unwrap();

        assert_eq!(edited.allocations[0].allocated_paise, Paise(50_000));
        assert_eq!(edited.allocations[1].allocated_paise, Paise(34_000));
        assert_eq!(edited.allocations[2].allocated_paise, Paise(34_000));

        // Partial payment for Priya (owes ₹340.00, pays ₹140.00 first, then ₹200.00)
        let partial = calculate_outstanding_amount(
            Paise(34_000),
            Paise::ZERO,
            Paise::ZERO,
            Paise(14_000),
        )
        .unwrap();
        assert_eq!(partial.remaining_outstanding, Paise(20_000));
        assert_eq!(partial.updated_status, crate::balances::PaymentStatus::PartiallyPaid);

        let settled = calculate_outstanding_amount(
            Paise(34_000),
            Paise::ZERO,
            Paise(14_000),
            Paise(20_000),
        )
        .unwrap();
        assert_eq!(settled.remaining_outstanding, Paise::ZERO);
        assert_eq!(settled.updated_status, crate::balances::PaymentStatus::Paid);
    }

    #[test]
    fn test_group_balances_and_inr_formatting() {
        assert_eq!(Paise(12_345_678).format_inr(), "₹1,23,456.78");
        assert_eq!(Paise(118_000).format_inr(), "₹1,180.00");

        let exp = ExpenseRecordInput {
            expense_id: "exp-1".into(),
            group_id: Some("grp-1".into()),
            total_bill: Paise(118_000),
            allocations: vec![
                ("me".into(), Paise(47_200)),
                ("priya".into(), Paise(41_300)),
                ("rohan".into(), Paise(29_500)),
            ],
            original_contributions: vec![PayerContribution {
                participant_id: "me".into(),
                contributed_paise: Paise(118_000),
            }],
            expense_settlements: vec![SettlementRecord {
                settlement_id: "set-1".into(),
                expense_id: Some("exp-1".into()),
                from_participant_id: "priya".into(),
                to_participant_id: "me".into(),
                amount_paise: Paise(20_000),
                payment_method: "UPI".into(),
                recorded_at_epoch_ms: 1_700_000_000_000,
            }],
        };

        let grp = calculate_group_balances(Some("grp-1".into()), "me", &[exp], &[]).unwrap();
        // Priya owed 41,300, paid 20,000 -> owes 21,300. Rohan owes 29,500. Total receivable = 50,800.
        assert_eq!(grp.total_receivables, Paise(50_800));
        assert_eq!(grp.total_payables, Paise::ZERO);
    }
}