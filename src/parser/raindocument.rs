#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::wasm_bindgen;

/// Reserved constant values keys in RainDocuments
pub const RAIN_DOCUMENT_CONSTANTS: [(&str, &str); 9] = [
    (
        "infinity",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    (
        "max-uint-256",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    (
        "max-uint256",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ),
    ("max-uint-128", "0xffffffffffffffffffffffffffffffff"),
    ("max-uint128", "0xffffffffffffffffffffffffffffffff"),
    ("max-uint-64", "0xffffffffffffffff"),
    ("max-uint64", "0xffffffffffffffff"),
    ("max-uint-32", "0xffffffff"),
    ("max-uint32", "0xffffffff"),
];
