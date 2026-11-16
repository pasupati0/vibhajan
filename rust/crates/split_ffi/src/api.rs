use flutter_rust_bridge::frb;
use split_domain::{
     BasisPoints, ExpenseBalanceSummary, ExpenseRecordInput, GroupBalanceSummary, GstBreakdown,
    GstCalculationInput, GstMode, OutstandingComputation, Paise, ParticipantShareInput,
    PayerContribution, SettlementRecord, SplitResult, TaxStructure,
};
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Debug, Clone)]
pub struct FfiError {
    pub code: String,
    pub message: String,
}

fn guard_ffi<T, F: FnOnce() -> Result<T, split_domain::DomainError>>(f: F) -> Result<T, FfiError> {
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(Ok(val)) => Ok(val),
        Ok(Err(domain_err)) => Err(FfiError {
            code: "DOMAIN_VALIDATION_ERROR".to_string(),
            message: domain_err.to_string(),
        }),
        Err(_) => Err(FfiError {
            code: "RUST_ENGINE_PANIC_PREVENTED".to_string(),
            message: "An unexpected internal panic was caught at the FFI boundary.".to_string(),
        }),
    }
}

#[frb(init)]
pub fn init_Split_rust_engine() {
    flutter_rust_bridge::setup_default_user_utils();
}

#[frb(sync)]
pub fn ffi_format_inr(paise: i64) -> String {
    Paise(paise).format_inr()
}

/// 1 & 2. GST-inclusive/exclusive and CGST/SGST/IGST breakdown
pub fn ffi_calculate_gst(
    entered_amount_paise: i64,
    gst_rate_bps: u32,
    is_inclusive: bool,
    tax_structure: String,
) -> Result<GstBreakdown, FfiError> {
    guard_ffi(|| {
        let structure = match tax_structure.as_str() {
            "IGST" => TaxStructure::Igst,
            "NONE" => TaxStructure::None,
            _ => TaxStructure::CgstSgst,
        };
        split_domain::calculate_gst(&GstCalculationInput {
            entered_amount: Paise(entered_amount_paise),
            gst_rate_bps: BasisPoints(gst_rate_bps),
            mode: if is_inclusive {
                GstMode::Inclusive
            } else {
                GstMode::Exclusive
            },
            tax_structure: structure,
        })
    })
}

/// 3. Equal expense splitting with deterministic paise reconciliation
pub fn ffi_split_equally(
    total_bill_paise: i64,
    participant_ids: Vec<String>,
) -> Result<SplitResult, FfiError> {
    guard_ffi(|| split_domain::split_equally(Paise(total_bill_paise), &participant_ids))
}

/// 4. Percentage-based splitting (basis points)
pub fn ffi_split_by_percentage(
    total_bill_paise: i64,
    inputs: Vec<ParticipantShareInput>,
) -> Result<SplitResult, FfiError> {
    guard_ffi(|| split_domain::split_by_percentage(Paise(total_bill_paise), &inputs))
}

/// 5 & 6. Custom amount-based splitting and automatic unlocked share reconciliation
pub fn ffi_split_by_amount(
    total_bill_paise: i64,
    inputs: Vec<ParticipantShareInput>,
    auto_reconcile_unlocked: bool,
) -> Result<SplitResult, FfiError> {
    guard_ffi(|| {
        split_domain::split_by_amount(Paise(total_bill_paise), &inputs, auto_reconcile_unlocked)
    })
}

/// 7. Individual participant balance calculations on a bill
pub fn ffi_calculate_expense_balances(
    expense: ExpenseRecordInput,
) -> Result<ExpenseBalanceSummary, FfiError> {
    guard_ffi(|| split_domain::calculate_expense_balances(&expense))
}

/// 8 & 9. Group balance calculations and net receivable/payable computation
pub fn ffi_calculate_group_balances(
    group_id: Option<String>,
    self_participant_id: String,
    expenses: Vec<ExpenseRecordInput>,
    standalone_settlements: Vec<SettlementRecord>,
) -> Result<GroupBalanceSummary, FfiError> {
    guard_ffi(|| {
        split_domain::calculate_group_balances(
            group_id,
            &self_participant_id,
            &expenses,
            &standalone_settlements,
        )
    })
}

/// 10 & 11. Settlement and partial payment calculations
pub fn ffi_calculate_outstanding_amount(
    allocated_share_paise: i64,
    original_contribution_paise: i64,
    previous_settled_paise: i64,
    new_payment_paise: i64,
) -> Result<OutstandingComputation, FfiError> {
    guard_ffi(|| {
        split_domain::calculate_outstanding_amount(
            Paise(allocated_share_paise),
            Paise(original_contribution_paise),
            Paise(previous_settled_paise),
            Paise(new_payment_paise),
        )
    })
}

/// 12. Expense allocation and contribution validation
pub fn ffi_validate_expense(
    total_bill_paise: i64,
    allocations: Vec<(String, i64)>,
    original_contributions: Vec<(String, i64)>,
) -> Result<bool, FfiError> {
    guard_ffi(|| {
        let input = ExpenseRecordInput {
            expense_id: "validation-check".into(),
            group_id: None,
            total_bill: Paise(total_bill_paise),
            allocations: allocations
                .into_iter()
                .map(|(id, p)| (id, Paise(p)))
                .collect(),
            original_contributions: original_contributions
                .into_iter()
                .map(|(id, p)| PayerContribution {
                    participant_id: id,
                    contributed_paise: Paise(p),
                })
                .collect(),
            expense_settlements: vec![],
        };
        split_domain::validate_expense(&input).map(|_| true)
    })
}

/// 13. Indian phone number (+91) and UPI ID validation
#[frb(sync)]
pub fn ffi_validate_indian_phone(raw_phone: String) -> Result<String, FfiError> {
    guard_ffi(|| split_domain::validate_indian_phone(&raw_phone))
}

#[frb(sync)]
pub fn ffi_validate_upi_id(raw_upi: String) -> Result<String, FfiError> {
    guard_ffi(|| split_domain::validate_upi_id(&raw_upi))
}