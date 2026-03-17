use serde::Serialize;
use wasm_bindgen::prelude::*;

// ── Physical constants (CODATA 2018) ──────────────────────────────────────
const EV_PER_HARTREE: f64 = 27.211386245988;
const KCAL_MOL_PER_HARTREE: f64 = 627.5094740631;
const KJ_MOL_PER_HARTREE: f64 = 2625.4996394799;
const J_PER_HARTREE: f64 = 4.3597447222071e-18;
const K_PER_HARTREE: f64 = 315775.02480407;
const WAVENUMBER_PER_HARTREE: f64 = 219474.6313632;
const HZ_PER_HARTREE: f64 = 6.5796839205e15;
const NM_HARTREE: f64 = 45.56335; // product: nm × Eh
const GAMMA_H: f64 = 2.6752218744e8; // rad/(s·T)
const G_E: f64 = 2.00231930436256;
const MU_B: f64 = 9.2740100783e-24; // J/T

// ── Inner logic (testable without WASM) ──────────────────────────────────

fn unit_to_hartree_inner(value: f64, unit: &str) -> f64 {
    match unit {
        "hartree" => value,
        "ryd" => value / 2.0,
        "ev" => value / EV_PER_HARTREE,
        "kcal_mol" => value / KCAL_MOL_PER_HARTREE,
        "kj_mol" => value / KJ_MOL_PER_HARTREE,
        "j" => value / J_PER_HARTREE,
        "k" => value / K_PER_HARTREE,
        "wavenumber" => value / WAVENUMBER_PER_HARTREE,
        "hz" => value / HZ_PER_HARTREE,
        "nm" => NM_HARTREE / value,
        "sec" => 1.0 / (HZ_PER_HARTREE * value),
        "t_nmr" => value * (GAMMA_H / (2.0 * std::f64::consts::PI)) / HZ_PER_HARTREE,
        "t_epr" => value * (G_E * MU_B) / J_PER_HARTREE,
        _ => f64::NAN,
    }
}

#[derive(Serialize)]
struct ConversionResult {
    hartree: f64,
    ryd: f64,
    ev: f64,
    kcal_mol: f64,
    kj_mol: f64,
    j: f64,
    k: f64,
    wavenumber: f64,
    hz: f64,
    nm: f64,
    sec: f64,
    t_nmr: f64,
    t_epr: f64,
}

fn convert_all_inner(hartree: f64) -> ConversionResult {
    let hz = hartree * HZ_PER_HARTREE;
    let j = hartree * J_PER_HARTREE;
    ConversionResult {
        hartree,
        ryd: hartree * 2.0,
        ev: hartree * EV_PER_HARTREE,
        kcal_mol: hartree * KCAL_MOL_PER_HARTREE,
        kj_mol: hartree * KJ_MOL_PER_HARTREE,
        j,
        k: hartree * K_PER_HARTREE,
        wavenumber: hartree * WAVENUMBER_PER_HARTREE,
        hz,
        nm: NM_HARTREE / hartree,
        sec: 1.0 / hz,
        t_nmr: hz / (GAMMA_H / (2.0 * std::f64::consts::PI)),
        t_epr: j / (G_E * MU_B),
    }
}

// ── WASM bindings ─────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn unit_to_hartree(value: f64, unit: &str) -> f64 {
    unit_to_hartree_inner(value, unit)
}

#[wasm_bindgen]
pub fn convert_all(hartree: f64) -> JsValue {
    serde_wasm_bindgen::to_value(&convert_all_inner(hartree)).unwrap()
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    #[test]
    fn roundtrip_ryd() {
        assert!(close(unit_to_hartree_inner(2.0, "ryd"), 1.0, 1e-10));
    }

    #[test]
    fn roundtrip_ev() {
        assert!(close(
            unit_to_hartree_inner(EV_PER_HARTREE, "ev"),
            1.0,
            1e-10
        ));
    }

    #[test]
    fn roundtrip_kcal_mol() {
        assert!(close(
            unit_to_hartree_inner(KCAL_MOL_PER_HARTREE, "kcal_mol"),
            1.0,
            1e-8
        ));
    }

    #[test]
    fn roundtrip_kj_mol() {
        assert!(close(
            unit_to_hartree_inner(KJ_MOL_PER_HARTREE, "kj_mol"),
            1.0,
            1e-8
        ));
    }

    #[test]
    fn roundtrip_j() {
        assert!(close(unit_to_hartree_inner(J_PER_HARTREE, "j"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_k() {
        assert!(close(unit_to_hartree_inner(K_PER_HARTREE, "k"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_wavenumber() {
        assert!(close(
            unit_to_hartree_inner(WAVENUMBER_PER_HARTREE, "wavenumber"),
            1.0,
            1e-8
        ));
    }

    #[test]
    fn roundtrip_hz() {
        assert!(close(
            unit_to_hartree_inner(HZ_PER_HARTREE, "hz"),
            1.0,
            1e-8
        ));
    }

    #[test]
    fn roundtrip_nm() {
        let nm = NM_HARTREE / 1.0;
        assert!(close(unit_to_hartree_inner(nm, "nm"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_sec() {
        let sec = 1.0 / HZ_PER_HARTREE;
        assert!(close(unit_to_hartree_inner(sec, "sec"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_t_nmr() {
        let r = convert_all_inner(1.0);
        assert!(close(unit_to_hartree_inner(r.t_nmr, "t_nmr"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_t_epr() {
        let r = convert_all_inner(1.0);
        assert!(close(unit_to_hartree_inner(r.t_epr, "t_epr"), 1.0, 1e-8));
    }

    #[test]
    fn convert_all_base_values() {
        let r = convert_all_inner(1.0);
        assert_eq!(r.hartree, 1.0);
        assert_eq!(r.ryd, 2.0);
        assert!(close(r.ev, EV_PER_HARTREE, 1e-10));
    }

    #[test]
    fn reciprocal_units_zero_gives_infinity() {
        let r = convert_all_inner(0.0);
        assert!(r.nm.is_infinite());
        assert!(r.sec.is_infinite());
    }

    #[test]
    fn unknown_unit_gives_nan() {
        assert!(unit_to_hartree_inner(1.0, "furlong").is_nan());
    }
}
