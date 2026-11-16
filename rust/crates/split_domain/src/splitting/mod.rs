use crate::money::{allocate_largest_remainder, BasisPoints, Paise};
use crate::validation::DomainError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SplitMode {
    Equal,
    Percentage,
    CustomAmount,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParticipantShareInput {
    pub participant_id: String,
    pub percentage_bps: Option<BasisPoints>,
    pub custom_amount: Option<Paise>,
    /// True if user manually locked/edited this participant's share during reconciliation
    pub is_locked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParticipantAllocation {
    pub participant_id: String,
    pub allocated_paise: Paise,
    pub effective_percentage_bps: BasisPoints,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SplitResult {
    pub total_bill: Paise,
    pub allocations: Vec<ParticipantAllocation>,
    pub unallocated_remainder: Paise,
    pub is_reconciled: bool,
}

/// Splits `total_bill` equally across `participant_ids` using deterministic largest-remainder paise distribution.
pub fn split_equally(
    total_bill: Paise,
    participant_ids: &[String],
) -> Result<SplitResult, DomainError> {
    if total_bill.0 <= 0 {
        return Err(DomainError::InvalidAmount(
            "Total bill must be strictly positive".into(),
        ));
    }
    if participant_ids.is_empty() {
        return Err(DomainError::EmptyParticipants);
    }

    let weights = vec![1u64; participant_ids.len()];
    let shares = allocate_largest_remainder(total_bill, &weights);
    let bps_weights = allocate_largest_remainder(Paise(10_000), &weights);

    let allocations = participant_ids
        .iter()
        .zip(shares.into_iter())
        .zip(bps_weights.into_iter())
        .map(|((id, paise), bps)| ParticipantAllocation {
            participant_id: id.clone(),
            allocated_paise: paise,
            effective_percentage_bps: BasisPoints(bps.0 as u32),
        })
        .collect();

    Ok(SplitResult {
        total_bill,
        allocations,
        unallocated_remainder: Paise::ZERO,
        is_reconciled: true,
    })
}

/// Splits `total_bill` by basis points (must sum to exactly 10,000 bps = 100.00%).
pub fn split_by_percentage(
    total_bill: Paise,
    inputs: &[ParticipantShareInput],
) -> Result<SplitResult, DomainError> {
    if total_bill.0 <= 0 {
        return Err(DomainError::InvalidAmount(
            "Total bill must be strictly positive".into(),
        ));
    }
    if inputs.is_empty() {
        return Err(DomainError::EmptyParticipants);
    }

    let mut total_bps: u64 = 0;
    let mut weights: Vec<u64> = Vec::with_capacity(inputs.len());

    for item in inputs {
        let bps = item.percentage_bps.ok_or_else(|| {
            DomainError::InvalidPercentage(format!(
                "Missing percentage for participant {}",
                item.participant_id
            ))
        })?;
        total_bps += bps.0 as u64;
        weights.push(bps.0 as u64);
    }

    if total_bps != 10_000 {
        return Err(DomainError::PercentageSumMismatch {
            expected_bps: 10_000,
            actual_bps: total_bps as u32,
        });
    }

    let shares = allocate_largest_remainder(total_bill, &weights);
    let allocations = inputs
        .iter()
        .zip(shares.into_iter())
        .map(|(item, paise)| ParticipantAllocation {
            participant_id: item.participant_id.clone(),
            allocated_paise: paise,
            effective_percentage_bps: item.percentage_bps.unwrap_or_default(),
        })
        .collect();

    Ok(SplitResult {
        total_bill,
        allocations,
        unallocated_remainder: Paise::ZERO,
        is_reconciled: true,
    })
}

/// Validates and reconciles custom amount splits. If some participants are unlocked (`is_locked == false`),
/// distributes the remaining unallocated balance evenly among unlocked participants.
pub fn split_by_amount(
    total_bill: Paise,
    inputs: &[ParticipantShareInput],
    auto_reconcile_unlocked: bool,
) -> Result<SplitResult, DomainError> {
    if total_bill.0 <= 0 {
        return Err(DomainError::InvalidAmount(
            "Total bill must be strictly positive".into(),
        ));
    }
    if inputs.is_empty() {
        return Err(DomainError::EmptyParticipants);
    }

    let mut locked_sum = Paise::ZERO;
    let mut unlocked_indices = Vec::new();
    let mut current_amounts = vec![Paise::ZERO; inputs.len()];

    for (idx, item) in inputs.iter().enumerate() {
        let amt = item.custom_amount.unwrap_or(Paise::ZERO);
        if amt.is_negative() {
            return Err(DomainError::NegativeAllocation(
                item.participant_id.clone(),
            ));
        }
        if item.is_locked || !auto_reconcile_unlocked {
            locked_sum += amt;
            current_amounts[idx] = amt;
        } else {
            unlocked_indices.push(idx);
        }
    }

    if locked_sum > total_bill {
        return Err(DomainError::OverAllocation {
            bill_total: total_bill,
            allocated_total: locked_sum,
        });
    }

    if auto_reconcile_unlocked && !unlocked_indices.is_empty() {
        let remainder_to_distribute = total_bill - locked_sum;
        let weights = vec![1u64; unlocked_indices.len()];
        let distributed = allocate_largest_remainder(remainder_to_distribute, &weights);
        for (idx_pos, &target_idx) in unlocked_indices.iter().enumerate() {
            current_amounts[target_idx] = distributed[idx_pos];
        }
    }

    let final_sum: Paise = current_amounts
        .iter()
        .copied()
        .fold(Paise::ZERO, |acc, x| acc + x);
    let unallocated = total_bill - final_sum;

    if unallocated.0 < 0 {
        return Err(DomainError::OverAllocation {
            bill_total: total_bill,
            allocated_total: final_sum,
        });
    }

    let allocations = inputs
        .iter()
        .zip(current_amounts.into_iter())
        .map(|(item, amt)| {
            let eff_bps = if total_bill.0 > 0 {
                ((amt.0 as i128 * 10_000) / (total_bill.0 as i128)) as u32
            } else {
                0
            };
            ParticipantAllocation {
                participant_id: item.participant_id.clone(),
                allocated_paise: amt,
                effective_percentage_bps: BasisPoints(eff_bps),
            }
        })
        .collect();

    Ok(SplitResult {
        total_bill,
        allocations,
        unallocated_remainder: unallocated,
        is_reconciled: unallocated.is_zero(),
    })
}