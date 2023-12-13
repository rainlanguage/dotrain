use super::{ast::*, ExpressionConfig};
use serde_wasm_bindgen::{Error, to_value, from_value};
use wasm_bindgen::{
    JsValue,
    convert::*,
    describe::{WasmDescribeVector, inform, VECTOR, WasmDescribe},
};

impl VectorIntoWasmAbi for Problem {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<Problem> for JsValue {
    fn from(value: Problem) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for Problem {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for Problem {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for Problem {
    fn describe_vector() {
        inform(VECTOR);
        Problem::describe();
    }
}

impl VectorIntoWasmAbi for ParsedItem {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<ParsedItem> for JsValue {
    fn from(value: ParsedItem) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for ParsedItem {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for ParsedItem {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for ParsedItem {
    fn describe_vector() {
        inform(VECTOR);
        ParsedItem::describe();
    }
}

impl VectorIntoWasmAbi for Comment {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<Comment> for JsValue {
    fn from(value: Comment) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for Comment {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for Comment {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for Comment {
    fn describe_vector() {
        inform(VECTOR);
        Comment::describe();
    }
}

impl VectorIntoWasmAbi for Import {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<Import> for JsValue {
    fn from(value: Import) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for Import {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for Import {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for Import {
    fn describe_vector() {
        inform(VECTOR);
        Import::describe();
    }
}

impl VectorIntoWasmAbi for Binding {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<Binding> for JsValue {
    fn from(value: Binding) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for Binding {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for Binding {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for Binding {
    fn describe_vector() {
        inform(VECTOR);
        Binding::describe();
    }
}

impl VectorIntoWasmAbi for ContextAlias {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<ContextAlias> for JsValue {
    fn from(value: ContextAlias) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for ContextAlias {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for ContextAlias {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for ContextAlias {
    fn describe_vector() {
        inform(VECTOR);
        ContextAlias::describe();
    }
}

impl VectorIntoWasmAbi for RainlangSource {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<RainlangSource> for JsValue {
    fn from(value: RainlangSource) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for RainlangSource {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for RainlangSource {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for RainlangSource {
    fn describe_vector() {
        inform(VECTOR);
        RainlangSource::describe();
    }
}

impl VectorIntoWasmAbi for ExpressionConfig {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<ExpressionConfig> for JsValue {
    fn from(value: ExpressionConfig) -> Self {
        to_value(&value).unwrap()
    }
}
impl TryFromJsValue for ExpressionConfig {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for ExpressionConfig {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for ExpressionConfig {
    fn describe_vector() {
        inform(VECTOR);
        ExpressionConfig::describe();
    }
}
