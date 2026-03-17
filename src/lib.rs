use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn unit_to_hartree(_value: f64, _unit: &str) -> f64 {
    0.0 // placeholder
}

#[wasm_bindgen]
pub fn convert_all(_hartree: f64) -> JsValue {
    JsValue::NULL // placeholder
}
