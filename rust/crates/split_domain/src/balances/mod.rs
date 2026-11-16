use crate::money::Paise;
use crate:: settlements::SettlementRecord;
use crate::validation::DomainError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Tracks how much a participant originally paid at the counter toward the bill.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PayerContribution {
    pub participant_id: String,
    pub contributed_paise: Paise,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PaymentStatus {
    Paid,
    PartiallyPaid,
    Unpaid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExpenseParticipantStanding {
    pub participant_id: String,
    pub allocated_share: Paise,
    pub original_contribution: Paise,
    pub subsequent_settled_amount: Paise,
    /// Positive means participant still owes toward this bill; negative means participant is owed back.
    pub remaining_outstanding: Paise,
    pub status: PaymentStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExpenseBalanceSummary {
    pub expense_id: String,
    pub total_bill: Paise,
    pub standings: Vec<ExpenseParticipantStanding>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExpenseRecordInput {
    pub expense_id: String,
    pub group_id: Option<String>,
    pub total_bill: Paise,
    /// Allocated share per participant
    pub allocations: Vec<(String, Paise)>,
    /// Original payment at the point of sale
    pub original_contributions: Vec<PayerContribution>,
    /// Subsequent settlement payments specifically linked to this expense
    pub expense_settlements: Vec<SettlementRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CounterpartyBalance {
    pub participant_id: String,
    /// Positive = owes the viewing user (Receivable). Negative = viewing user owes them (Payable).
    pub net_paise: Paise,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GroupBalanceSummary {
    pub group_id: Option<String>,
    pub total_receivables: Paise,
    pub total_payables: Paise,
    pub net_position: Paise,
    pub member_net_balances: Vec<CounterpartyBalance>,
    pub pairwise_debts: Vec<PairwiseDebt>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PairwiseDebt {
    pub from_participant_id: String,
    pub to_participant_id: String,
    pub amount_paise: Paise,
}

/// Calculates each participant's standing on a single bill, keeping original bill contributions
/// and subsequent settlements strictly separated.
pub fn calculate_expense_balances(
    expense: &ExpenseRecordInput,
) -> Result<ExpenseBalanceSummary, DomainError> {
    let alloc_sum: Paise = expense
        .allocations
        .iter()
        .map(|(_, a)| *a)
        .fold(Paise::ZERO, |acc, x| acc + x);

    if alloc_sum != expense.total_bill {
        return Err(DomainError::AllocationTotalMismatch {
            bill_total: expense.total_bill,
            allocated_total: alloc_sum,
        });
    }

    let contrib_sum: Paise = expense
        .original_contributions
        .iter()
        .map(|c| c.contributed_paise)
        .fold(Paise::ZERO, |acc, x| acc + x);

    if contrib_sum != expense.total_bill {
        return Err(DomainError::ContributionTotalMismatch {
            bill_total: expense.total_bill,
            contributed_total: contrib_sum,
        });
    }

    let mut contrib_map: BTreeMap<String, Paise> = BTreeMap::new();
    for c in &expense.original_contributions {
        *contrib_map.entry(c.participant_id.clone()).or_default() += c.contributed_paise;
    }

    let mut settled_map: BTreeMap<String, Paise> = BTreeMap::new();
    for s in &expense.expense_settlements {
        // Payer in settlement reduces their outstanding debt
        *settled_map.entry(s.from_participant_id.clone()).or_default() += s.amount_paise;
        // Receiver in settlement reduces their net credit
        *settled_map.entry(s.to_participant_id.clone()).or_default() -= s.amount_paise;
    }

    let mut standings = Vec::with_capacity(expense.allocations.len());
    for (pid, allocated) in &expense.allocations {
        let orig = contrib_map.get(pid).copied().unwrap_or(Paise::ZERO);
        let settled = settled_map.get(pid).copied().unwrap_or(Paise::ZERO);

        // Positive remaining_outstanding means participant owes money on this bill
        let remaining_outstanding = *allocated - orig - settled;

        let status = if remaining_outstanding.0 <= 0 {
            PaymentStatus::Paid
        } else if orig.0 > 0 || settled.0 > 0 {
            PaymentStatus::PartiallyPaid
        } else {
            PaymentStatus::Unpaid
        };

        standings.push(ExpenseParticipantStanding {
            participant_id: pid.clone(),
            allocated_share: *allocated,
            original_contribution: orig,
            subsequent_settled_amount: settled.max(Paise::ZERO),
            remaining_outstanding,
            status,
        });
    }

    Ok(ExpenseBalanceSummary {
        expense_id: expense.expense_id.clone(),
        total_bill: expense.total_bill,
        standings,
    })
}

/// Calculates group-level or overall balances and pairwise simplified debts across multiple expenses
/// and standalone settlements, anchored around `self_participant_id`.
pub fn calculate_group_balances(
    group_id: Option<String>,
    self_participant_id: &str,
    expenses: &[ExpenseRecordInput],
    standalone_settlements: &[SettlementRecord],
) -> Result<GroupBalanceSummary, DomainError> {
    // net_ledger[p] > 0 means participant p is owed money overall (creditor)
    // net_ledger[p] < 0 means participant p owes money overall (debtor)
    let mut net_ledger: BTreeMap<String, Paise> = BTreeMap::new();

    for exp in expenses {
        let summary = calculate_expense_balances(exp)?;
        for st in summary.standings {
            // If remaining_outstanding > 0, they owe money (-remaining_outstanding to their net credit)
            *net_ledger.entry(st.participant_id).or_default() -= st.remaining_outstanding;
        }
    }

    for settlement in standalone_settlements {
        if settlement.amount_paise.0 <= 0 {
            return Err(DomainError::InvalidAmount(
                "Settlement amount must be positive".into(),
            ));
        }
        *net_ledger
            .entry(settlement.from_participant_id.clone())
            .or_default() += settlement.amount_paise;
        *net_ledger
            .entry(settlement.to_participant_id.clone())
            .or_default() -= settlement.amount_paise;
    }

    // Simplify debts deterministically
    let pairwise_debts = simplify_debts(&net_ledger);

    let mut total_receivables = Paise::ZERO;
    let mut total_payables = Paise::ZERO;
    let mut member_net_balances = Vec::new();

    for (pid, &net) in &net_ledger {
        if pid == self_participant_id {
            continue;
        }
        // Compute direct net relative to self_participant_id from pairwise_debts
        let mut owed_to_me = Paise::ZERO;
        for debt in &pairwise_debts {
            if debt.from_participant_id == *pid && debt.to_participant_id == self_participant_id {
                owed_to_me += debt.amount_paise;
            } else if debt.from_participant_id == self_participant_id
                && debt.to_participant_id == *pid
            {
                owed_to_me -= debt.amount_paise;
            }
        }
        if owed_to_me.0 > 0 {
            total_receivables += owed_to_me;
        } else if owed_to_me.0 < 0 {
            total_payables += owed_to_me.abs();
        }
        member_net_balances.push(CounterpartyBalance {
            participant_id: pid.clone(),
            net_paise: owed_to_me,
        });
    }

    let _ = net; // suppress unused warning if only self exists
    let net_position = total_receivables - total_payables;

    Ok(GroupBalanceSummary {
        group_id,
        total_receivables,
        total_payables,
        net_position,
        member_net_balances,
        pairwise_debts,
    })
}

fn simplify_debts(net_ledger: &BTreeMap<String, Paise>) -> Vec<PairwiseDebt> {
    let mut debtors: Vec<(String, i64)> = Vec::new();
    let mut creditors: Vec<(String, i64)> = Vec::new();

    for (pid, &amount) in net_ledger {
        if amount.0 < 0 {
            debtors.push((pid.clone(), -amount.0));
        } else if amount.0 > 0 {
            creditors.push((pid.clone(), amount.0));
        }
    }

    // Sort descending by amount, then ascending by ID for 100% deterministic matching
    debtors.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    creditors.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    let mut result = Vec::new();
    let mut d_idx = 0;
    let mut c_idx = 0;

    while d_idx < debtors.len() && c_idx < creditors.len() {
        let settle_amt = debtors[d_idx].1.min(creditors[c_idx].1);
        if settle_amt > 0 {
            result.push(PairwiseDebt {
                from_participant_id: debtors[d_idx].0.clone(),
                to_participant_id: creditors[c_idx].0.clone(),
                amount_paise: Paise(settle_amt),
            });
        }
        debtors[d_idx].1 -= settle_amt;
        creditors[c_idx].1 -= settle_amt;

        if debtors[d_idx].1 == 0 {
            d_idx += 1;
        }
        if creditors[c_idx].1 == 0 {
            c_idx += 1;
        }
    }

    result
}