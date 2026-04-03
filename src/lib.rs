use serde::Serialize;
use wasm_bindgen::prelude::*;

const DEFAULT_CODATA_VERSION: &str = "2018";
const SUPPORTED_CODATA_VERSIONS: [&str; 8] =
    ["1986", "1998", "2002", "2006", "2010", "2014", "2018", "2022"];

// ASE does not define these spectroscopy-specific constants, so keep the
// auxiliary factors fixed while the energy/unit factors follow ASE CODATA sets.
const GAMMA_H: f64 = 2.675_221_874_4e8; // rad/(s·T), CODATA 2018
const G_E: f64 = 2.002_319_304_362_56; // electron g-factor, CODATA 2018

#[derive(Clone, Copy)]
struct CodataBase {
    c: f64,
    mu0: f64,
    hplanck: f64,
    e: f64,
    me: f64,
    nav: f64,
    k: f64,
}

#[derive(Clone, Copy)]
struct UnitSet {
    ev_per_hartree: f64,
    kcal_mol_per_hartree: f64,
    kj_mol_per_hartree: f64,
    j_per_hartree: f64,
    k_per_hartree: f64,
    wavenumber_per_hartree: f64,
    hz_per_hartree: f64,
    nm_hartree: f64,
    epr_j_per_t: f64,
}

fn codata_base(version: &str) -> Option<CodataBase> {
    let pi = std::f64::consts::PI;
    match version {
        "1986" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_075_5e-34,
            e: 1.602_177_33e-19,
            me: 9.109_389_7e-31,
            nav: 6.022_136_7e23,
            k: 1.380_658e-23,
        }),
        "1998" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_068_76e-34,
            e: 1.602_176_462e-19,
            me: 9.109_381_88e-31,
            nav: 6.022_141_99e23,
            k: 1.380_650_3e-23,
        }),
        "2002" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_069_3e-34,
            e: 1.602_176_53e-19,
            me: 9.109_382_6e-31,
            nav: 6.022_141_5e23,
            k: 1.380_650_5e-23,
        }),
        "2006" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_068_96e-34,
            e: 1.602_176_487e-19,
            me: 9.109_382_15e-31,
            nav: 6.022_141_79e23,
            k: 1.380_650_4e-23,
        }),
        "2010" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_069_57e-34,
            e: 1.602_176_565e-19,
            me: 9.109_382_91e-31,
            nav: 6.022_141_29e23,
            k: 1.380_648_8e-23,
        }),
        "2014" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 4.0e-7 * pi,
            hplanck: 6.626_070_040e-34,
            e: 1.602_176_620_8e-19,
            me: 9.109_383_56e-31,
            nav: 6.022_140_857e23,
            k: 1.380_648_52e-23,
        }),
        "2018" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 1.256_637_062_12e-6,
            hplanck: 6.626_070_15e-34,
            e: 1.602_176_634e-19,
            me: 9.109_383_701_5e-31,
            nav: 6.022_140_76e23,
            k: 1.380_649e-23,
        }),
        "2022" => Some(CodataBase {
            c: 299_792_458.0,
            mu0: 1.256_637_061_27e-6,
            hplanck: 6.626_070_15e-34,
            e: 1.602_176_634e-19,
            me: 9.109_383_713_9e-31,
            nav: 6.022_140_76e23,
            k: 1.380_649e-23,
        }),
        _ => None,
    }
}

fn unit_set(codata_version: &str) -> UnitSet {
    let base = codata_base(codata_version)
        .or_else(|| codata_base(DEFAULT_CODATA_VERSION))
        .unwrap();
    let pi = std::f64::consts::PI;
    let eps0 = 1.0 / base.mu0 / base.c.powi(2);
    let hbar = base.hplanck / (2.0 * pi);
    let ev_per_hartree =
        base.me * base.e.powi(3) / (16.0 * pi.powi(2) * eps0.powi(2) * hbar.powi(2));
    let j_per_hartree = ev_per_hartree * base.e;
    let kj_mol_per_hartree = j_per_hartree * base.nav / 1000.0;
    let kcal_mol_per_hartree = kj_mol_per_hartree / 4.184;
    let k_per_hartree = j_per_hartree / base.k;
    let wavenumber_per_hartree = j_per_hartree / (100.0 * base.c * base.hplanck);
    let hz_per_hartree = j_per_hartree / base.hplanck;
    let nm_hartree = 1.0e9 * base.hplanck * base.c / j_per_hartree;
    let mu_b = base.e * hbar / (2.0 * base.me);

    UnitSet {
        ev_per_hartree,
        kcal_mol_per_hartree,
        kj_mol_per_hartree,
        j_per_hartree,
        k_per_hartree,
        wavenumber_per_hartree,
        hz_per_hartree,
        nm_hartree,
        epr_j_per_t: G_E * mu_b,
    }
}

// ── Inner logic (testable without WASM) ──────────────────────────────────

fn unit_to_hartree_inner(value: f64, unit: &str, codata_version: &str) -> f64 {
    let units = unit_set(codata_version);
    match unit {
        "hartree" => value,
        "ryd" => value / 2.0,
        "ev" => value / units.ev_per_hartree,
        "kcal_mol" => value / units.kcal_mol_per_hartree,
        "kj_mol" => value / units.kj_mol_per_hartree,
        "j" => value / units.j_per_hartree,
        "k" => value / units.k_per_hartree,
        "wavenumber" => value / units.wavenumber_per_hartree,
        "hz" => value / units.hz_per_hartree,
        "nm" => units.nm_hartree / value,
        "sec" => 1.0 / (units.hz_per_hartree * value),
        "t_nmr" => value * (GAMMA_H / (2.0 * std::f64::consts::PI)) / units.hz_per_hartree,
        "t_epr" => value * units.epr_j_per_t / units.j_per_hartree,
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

fn convert_all_inner(hartree: f64, codata_version: &str) -> ConversionResult {
    let units = unit_set(codata_version);
    let hz = hartree * units.hz_per_hartree;
    let j = hartree * units.j_per_hartree;

    ConversionResult {
        hartree,
        ryd: hartree * 2.0,
        ev: hartree * units.ev_per_hartree,
        kcal_mol: hartree * units.kcal_mol_per_hartree,
        kj_mol: hartree * units.kj_mol_per_hartree,
        j,
        k: hartree * units.k_per_hartree,
        wavenumber: hartree * units.wavenumber_per_hartree,
        hz,
        nm: units.nm_hartree / hartree,
        sec: 1.0 / hz,
        t_nmr: hz / (GAMMA_H / (2.0 * std::f64::consts::PI)),
        t_epr: j / units.epr_j_per_t,
    }
}

// ── WASM bindings ─────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn default_codata_version() -> String {
    DEFAULT_CODATA_VERSION.to_string()
}

#[wasm_bindgen]
pub fn supported_codata_versions() -> JsValue {
    serde_wasm_bindgen::to_value(&SUPPORTED_CODATA_VERSIONS).unwrap()
}

#[wasm_bindgen]
pub fn unit_to_hartree(value: f64, unit: &str) -> f64 {
    unit_to_hartree_inner(value, unit, DEFAULT_CODATA_VERSION)
}

#[wasm_bindgen]
pub fn unit_to_hartree_with_codata(value: f64, unit: &str, codata_version: &str) -> f64 {
    unit_to_hartree_inner(value, unit, codata_version)
}

#[wasm_bindgen]
pub fn convert_all(hartree: f64) -> JsValue {
    serde_wasm_bindgen::to_value(&convert_all_inner(hartree, DEFAULT_CODATA_VERSION)).unwrap()
}

#[wasm_bindgen]
pub fn convert_all_with_codata(hartree: f64, codata_version: &str) -> JsValue {
    serde_wasm_bindgen::to_value(&convert_all_inner(hartree, codata_version)).unwrap()
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    fn assert_roundtrips(version: &str) {
        let units = unit_set(version);
        let result = convert_all_inner(1.0, version);

        assert!(close(unit_to_hartree_inner(2.0, "ryd", version), 1.0, 1e-12));
        assert!(close(
            unit_to_hartree_inner(units.ev_per_hartree, "ev", version),
            1.0,
            1e-12
        ));
        assert!(close(
            unit_to_hartree_inner(units.kcal_mol_per_hartree, "kcal_mol", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.kj_mol_per_hartree, "kj_mol", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.j_per_hartree, "j", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.k_per_hartree, "k", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.wavenumber_per_hartree, "wavenumber", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.hz_per_hartree, "hz", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(units.nm_hartree, "nm", version),
            1.0,
            1e-9
        ));
        assert!(close(
            unit_to_hartree_inner(1.0 / units.hz_per_hartree, "sec", version),
            1.0,
            1e-9
        ));
        assert!(close(unit_to_hartree_inner(result.t_nmr, "t_nmr", version), 1.0, 1e-9));
        assert!(close(unit_to_hartree_inner(result.t_epr, "t_epr", version), 1.0, 1e-9));
    }

    #[test]
    fn roundtrips_all_supported_codata_versions() {
        for version in SUPPORTED_CODATA_VERSIONS {
            assert_roundtrips(version);
        }
    }

    #[test]
    fn default_dataset_matches_ase_codata_2018_values() {
        let result = convert_all_inner(1.0, DEFAULT_CODATA_VERSION);
        assert_eq!(result.hartree, 1.0);
        assert_eq!(result.ryd, 2.0);
        assert!(close(result.ev, 27.211_386_245_769_3, 1e-12));
        assert!(close(result.kcal_mol, 627.509_474_058_011_6, 1e-9));
        assert!(close(result.kj_mol, 2625.499_639_458_720_6, 1e-9));
        assert!(close(result.j, 4.359_744_722_172_055e-18, 1e-30));
        assert!(close(result.k, 315_775.024_801_528_5, 1e-8));
        assert!(close(result.wavenumber, 219_474.631_361_432_3, 1e-8));
        assert!(close(result.hz, 6.579_683_920_448_767e15, 1e3));
        assert!(close(result.nm, 45.563_352_529_486_35, 1e-11));
    }

    #[test]
    fn codata_version_changes_conversion_factors() {
        let ev_2014 = convert_all_inner(1.0, "2014").ev;
        let ev_2018 = convert_all_inner(1.0, "2018").ev;
        let ev_2022 = convert_all_inner(1.0, "2022").ev;

        assert!(!close(ev_2014, ev_2018, 1e-12));
        assert!(!close(ev_2018, ev_2022, 1e-12));
    }

    #[test]
    fn reciprocal_units_zero_gives_infinity() {
        let result = convert_all_inner(0.0, DEFAULT_CODATA_VERSION);
        assert!(result.nm.is_infinite());
        assert!(result.sec.is_infinite());
    }

    #[test]
    fn unknown_unit_gives_nan() {
        assert!(unit_to_hartree_inner(1.0, "furlong", DEFAULT_CODATA_VERSION).is_nan());
    }

    #[test]
    fn unknown_codata_version_falls_back_to_default() {
        let fallback = convert_all_inner(1.0, "9999");
        let default = convert_all_inner(1.0, DEFAULT_CODATA_VERSION);
        assert!(close(fallback.ev, default.ev, 1e-12));
        assert!(close(fallback.hz, default.hz, 1e3));
    }
}
