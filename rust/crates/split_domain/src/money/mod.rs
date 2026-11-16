use serde::{Deserialize, Serialize};
use std::fmt;
use std::ops::{Add, AddAssign, Sub, SubAssign};

/// Authoritative monetary unit stored strictly as signed integer paise (₹1.00 = 100 paise).
/// Never uses IEEE-754 floating-point representations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, Default)]
pub struct Paise(pub i64);

/// Basis points representation for percentages (100.00% = 10_000 bps, 18.00% = 1_800 bps).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, Default)]
pub struct BasisPoints(pub u32);

impl Paise {
    pub const ZERO: Paise = Paise(0);

    pub const fn from_rupees_exact(rupees: i64) -> Self {
        Self(rupees * 100)
    }

    pub const fn as_i64(self) -> i64 {
        self.0
    }

    pub const fn is_negative(self) -> bool {
        self.0 < 0
    }

    pub const fn is_zero(self) -> bool {
        self.0 == 0
    }

    pub const fn abs(self) -> Self {
        Self(self.0.abs())
    }

    /// Formats paise into Indian numbering system string with ₹ symbol (e.g., ₹1,23,456.78)
    pub fn format_inr(self) -> String {
        let negative = self.0 < 0;
        let abs_val = self.0.unsigned_abs();
        let rupees = abs_val / 100;
        let paise_part = abs_val % 100;

        let formatted_rupees = format_indian_integer(rupees);
        if negative {
            format!("-₹{}.{:02}", formatted_rupees, paise_part)
        } else {
            format!("₹{}.{:02}", formatted_rupees, paise_part)
        }
    }
}

fn format_indian_integer(n: u64) -> String {
    let s = n.to_string();
    if s.len() <= 3 {
        return s;
    }
    let (head, last_three) = s.split_at(s.len() - 3);
    let mut groups = Vec::new();
    let mut rem = head;
    while rem.len() > 2 {
        let (h, t) = rem.split_at(rem.len() - 2);
        groups.push(t);
        rem = h;
    }
    if !rem.is_empty() {
        groups.push(rem);
    }
    groups.reverse();
    format!("{},{}", groups.join(","), last_three)
}

/// Deterministic half-up integer division: rounds `numerator / denominator` to nearest integer,
/// with ties rounding away from zero.
pub fn div_round_half_up(numerator: i128, denominator: i128) -> i64 {
    assert!(denominator > 0, "Denominator must be strictly positive");
    if numerator >= 0 {
        ((numerator + (denominator / 2)) / denominator) as i64
    } else {
        ((numerator - (denominator / 2)) / denominator) as i64
    }
}

/// Largest-Remainder (Hamilton) method for distributing `total_paise` across `weights`.
/// Guarantees that the sum of returned allocations equals `total_paise` to the exact paisa.
/// Ties in fractional remainders are broken deterministically by participant order index.
pub fn allocate_largest_remainder(total_paise: Paise, weights: &[u64]) -> Vec<Paise> {
    if weights.is_empty() || total_paise.0 == 0 {
        return vec![Paise::ZERO; weights.len()];
    }
    let weight_sum: u128 = weights.iter().map(|&w| w as u128).sum();
    if weight_sum == 0 {
        return vec![Paise::ZERO; weights.len()];
    }

    let sign = if total_paise.0 < 0 { -1i64 } else { 1i64 };
    let abs_total = total_paise.0.unsigned_abs() as u128;

    let mut quotas: Vec<i64> = Vec::with_capacity(weights.len());
    let mut remainders: Vec<(usize, u128)> = Vec::with_capacity(weights.len());
    let mut allocated_sum: u128 = 0;

    for (idx, &w) in weights.iter().enumerate() {
        let numerator = abs_total * (w as u128);
        let floor_share = numerator / weight_sum;
        let rem = numerator % weight_sum;
        quotas.push(floor_share as i64);
        remainders.push((idx, rem));
        allocated_sum += floor_share;
    }

    let mut shortfall = (abs_total - allocated_sum) as usize;
    // Sort by largest remainder descending, then by original index ascending for deterministic tie-breaking
    remainders.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    for (idx, _) in remainders.into_iter().take(shortfall) {
        quotas[idx] += 1;
        shortfall = shortfall.saturating_sub(1);
    }

    quotas.into_iter().map(|q| Paise(q * sign)).collect()
}

impl Add for Paise {
    type Output = Self;
    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl AddAssign for Paise {
    fn add_assign(&mut self, rhs: Self) {
        self.0 += rhs.0;
    }
}

impl Sub for Paise {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0)
    }
}

impl SubAssign for Paise {
    fn sub_assign(&mut self, rhs: Self) {
        self.0 -= rhs.0;
    }
}

impl fmt::Display for Paise {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format_inr())
    }
}