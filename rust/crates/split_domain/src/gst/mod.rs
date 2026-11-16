use crate::money::{div_round_half_up, BasisPoints, Paise};
use crate::validation::DomainError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GstMode {
    Inclusive,
    Exclusive,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaxStructure {
    /// Intra-state supply: splits total GST evenly into CGST and SGST (any odd paisa goes to SGST)
    CgstSgst,
    /// Inter-state supply: full GST assigned to IGST
    Igst,
    /// Zero / Non-GST supply
    None,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GstCalculationInput {
    pub entered_amount: Paise,
    pub gst_rate_bps: BasisPoints,
    pub mode: GstMode,
    pub tax_structure: TaxStructure,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GstBreakdown {
    pub taxable_amount: Paise,
    pub total_gst: Paise,
    pub cgst_amount: Paise,
    pub sgst_amount: Paise,
    pub igst_amount: Paise,
    pub gross_total: Paise,
    pub gst_rate_bps: BasisPoints,
    pub mode: GstMode,
    pub tax_structure: TaxStructure,
}

/// Calculates GST-inclusive or GST-exclusive breakdown using integer arithmetic.
/// Does not infer tax jurisdiction from the GST rate; strictly obeys `input.tax_structure`.
pub fn calculate_gst(input: &GstCalculationInput) -> Result<GstBreakdown, DomainError> {
    if input.entered_amount.0 <= 0 {
        return Err(DomainError::InvalidAmount(
            "Bill amount must be greater than zero paise".into(),
        ));
    }
    if input.gst_rate_bps.0 > 10_000 {
        return Err(DomainError::InvalidGstRate(
            "GST rate cannot exceed 100% (10,000 bps)".into(),
        ));
    }

    let rate = input.gst_rate_bps.0 as i128;
    let entered = input.entered_amount.0 as i128;

    let (taxable, total_gst, gross) = if rate == 0 || input.tax_structure == TaxStructure::None {
        (input.entered_amount, Paise::ZERO, input.entered_amount)
    } else {
        match input.mode {
            GstMode::Inclusive => {
                // taxable = entered * 10000 / (10000 + rate)
                let taxable_paise = div_round_half_up(entered * 10_000, 10_000 + rate);
                let gst_paise = input.entered_amount.0 - taxable_paise;
                (
                    Paise(taxable_paise),
                    Paise(gst_paise),
                    input.entered_amount,
                )
            }
            GstMode::Exclusive => {
                // gst = entered * rate / 10000
                let gst_paise = div_round_half_up(entered * rate, 10_000);
                let gross_paise = input.entered_amount.0 + gst_paise;
                (
                    input.entered_amount,
                    Paise(gst_paise),
                    Paise(gross_paise),
                )
            }
        }
    };

    let (cgst, sgst, igst) = match input.tax_structure {
        TaxStructure::CgstSgst => {
            let half_cgst = total_gst.0 / 2;
            let remainder_sgst = total_gst.0 - half_cgst;
            (Paise(half_cgst), Paise(remainder_sgst), Paise::ZERO)
        }
        TaxStructure::Igst => (Paise::ZERO, Paise::ZERO, total_gst),
        TaxStructure::None => (Paise::ZERO, Paise::ZERO, Paise::ZERO),
    };

    debug_assert_eq!(taxable + total_gst, gross);
    debug_assert_eq!(cgst + sgst + igst, total_gst);

    Ok(GstBreakdown {
        taxable_amount: taxable,
        total_gst,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        gross_total: gross,
        gst_rate_bps: input.gst_rate_bps,
        mode: input.mode,
        tax_structure: input.tax_structure,
    })
}