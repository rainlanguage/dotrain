use futures::executor::block_on;
use super::{
    store::MetaStore,
    Namespace, IRainDocument, IAuthoringMeta,
    super::{
        parser::raindocument::{RainDocument, Rebind},
        error::ComposeError,
        types::ast::{Problem, Import, Comment, Binding},
    },
};
use serde_wasm_bindgen::{Error, to_value, from_value};
use wasm_bindgen::{
    JsValue,
    convert::*,
    prelude::*,
    describe::{WasmDescribeVector, inform, VECTOR, WasmDescribe},
    UnwrapThrowExt,
};

#[wasm_bindgen]
impl RainDocument {
    /// Creates an instance with the given MetaStore and parses with remote meta search enabled
    #[wasm_bindgen(js_name = "createAsync")]
    pub async fn js_create_async(
        text: &str,
        meta_store: &MetaStore,
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        RainDocument::create_async(text.to_string(), Some(meta_store.0.clone()), None, rebinds)
            .await
    }

    /// Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(
        text: &str,
        meta_store: &MetaStore,
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        RainDocument::create(text.to_string(), Some(meta_store.0.clone()), None, rebinds)
    }

    // /// Creates an instance as createAsync() but with rebinds
    // #[wasm_bindgen(js_name = "createWithRebindsAsync")]
    // pub async fn js_create_with_rebinds_async(
    //     text: &str,
    //     meta_store: &MetaStore,
    //     rebinds: Vec<Rebind>,
    // ) -> RainDocument {
    //     RainDocument::create_with_rebinds_async(
    //         text.to_string(),
    //         Some(meta_store.0.clone()),
    //         None,
    //         rebinds,
    //     )
    //     .await
    //     .unwrap_throw()
    // }

    // /// Creates an instance as create() but with rebinds
    // #[wasm_bindgen(js_name = "createWithRebinds")]
    // pub fn js_create_with_rebinds(
    //     text: &str,
    //     meta_store: &MetaStore,
    //     rebinds: Vec<Rebind>,
    // ) -> RainDocument {
    //     RainDocument::create_with_rebinds(
    //         text.to_string(),
    //         Some(meta_store.0.clone()),
    //         None,
    //         rebinds,
    //     )
    //     .unwrap_throw()
    // }

    #[wasm_bindgen(js_name = "fromInterface")]
    pub fn from_interface(value: &IRainDocument, meta_store: &MetaStore) -> RainDocument {
        let mut rd =
            serde_wasm_bindgen::from_value::<RainDocument>(value.obj.clone()).unwrap_throw();
        rd.meta_store = meta_store.0.clone();
        rd
    }

    #[wasm_bindgen(js_name = "toInterface")]
    pub fn to_interface(&self) -> IRainDocument {
        IRainDocument {
            obj: serde_wasm_bindgen::to_value(&self).unwrap_throw(),
        }
    }

    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "update")]
    pub fn js_update(&mut self, new_text: &str, rebinds: Option<Vec<Rebind>>) {
        self.update(new_text.to_string(), rebinds)
    }

    /// Updates the text and parses right away with remote meta search enabled
    #[wasm_bindgen(js_name = "updateAsync")]
    pub async fn js_update_async(&mut self, new_text: &str, rebinds: Option<Vec<Rebind>>) {
        self.update_async(new_text.to_string(), rebinds).await;
    }

    // /// Updates the text as update() but with rebinds
    // #[wasm_bindgen(js_name = "updateWithRebinds")]
    // pub async fn js_update_with_rebinds(
    //     &mut self,
    //     new_text: &str,
    //     rebinds: Vec<Rebind>,
    // ) -> Result<(), String> {
    //     self.update_with_rebinds(new_text.to_string(), rebinds)
    //         .map_err(|e| e.to_string())
    // }

    // /// Updates the text as updateAsync() but with rebinds
    // #[wasm_bindgen(js_name = "updateWithRebindsAsync")]
    // pub async fn js_update_with_rebinds_async(
    //     &mut self,
    //     new_text: &str,
    //     rebinds: Vec<Rebind>,
    // ) -> Result<(), String> {
    //     self.update_with_rebinds_async(new_text.to_string(), rebinds)
    //         .await
    //         .map_err(|e| e.to_string())
    // }

    /// This instance's current text
    #[wasm_bindgen(getter, js_name = "text")]
    pub fn js_text(&self) -> String {
        self.text.clone()
    }

    /// This instance's current text
    #[wasm_bindgen(getter, js_name = "frontMatter")]
    pub fn js_front_matter(&self) -> String {
        self.front_matter().to_string()
    }

    /// This instance's current text
    #[wasm_bindgen(getter, js_name = "body")]
    pub fn js_body(&self) -> String {
        self.body().to_string()
    }

    /// This instance's top problems
    #[wasm_bindgen(getter, js_name = "problems")]
    pub fn js_problems(&self) -> Vec<Problem> {
        self.problems.clone()
    }

    /// This instance's comments
    #[wasm_bindgen(getter, js_name = "comments")]
    pub fn js_comments(&self) -> Vec<Comment> {
        self.comments.clone()
    }

    /// This instance's imports
    #[wasm_bindgen(getter, js_name = "imports")]
    pub fn js_imports(&self) -> Vec<Import> {
        self.imports.clone()
    }

    /// This instance's bindings
    #[wasm_bindgen(getter, js_name = "bindings")]
    pub fn js_bindings(&self) -> Vec<Binding> {
        self.bindings.clone()
    }

    /// This instance's namespace
    #[wasm_bindgen(getter, js_name = "namespace")]
    pub fn js_namespace(&self) -> Namespace {
        Namespace {
            obj: serde_wasm_bindgen::to_value(&self.namespace).unwrap_or(JsValue::NULL),
        }
    }

    /// This instance's MetaStore
    #[wasm_bindgen(getter, js_name = "metaStore")]
    pub fn js_store(&self) -> MetaStore {
        MetaStore(self.meta_store.clone())
    }

    /// This instance's AuthoringMeta
    #[wasm_bindgen(getter, js_name = "knownWords")]
    pub fn js_known_words(&self) -> Option<IAuthoringMeta> {
        self.known_words.as_ref().map(|am| IAuthoringMeta {
            obj: serde_wasm_bindgen::to_value(am).unwrap_or(JsValue::UNDEFINED),
        })
    }

    /// The error msg if parsing had resulted in an error
    #[wasm_bindgen(getter, js_name = "error")]
    pub fn js_runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// This instance's all problems (bindings + top)
    #[wasm_bindgen(getter, js_name = "allProblems")]
    pub fn js_all_problems(&self) -> Vec<Problem> {
        let mut all = vec![];
        all.extend(self.problems.clone());
        all.extend(self.bindings.iter().flat_map(|v| v.problems.clone()));
        all
    }

    /// This instance's bindings problems
    #[wasm_bindgen(getter, js_name = "bindingProblems")]
    pub fn js_bindings_problems(&self) -> Vec<Problem> {
        self.bindings
            .iter()
            .flat_map(|v| v.problems.clone())
            .collect()
    }

    /// Parses this instance's text with remote meta search enabled
    #[wasm_bindgen(js_name = "parseAsync")]
    pub async fn js_parse_async(&mut self, rebinds: Option<Vec<Rebind>>) {
        self.parse(true, rebinds).await;
    }

    /// Parses this instance's text with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "parse")]
    pub fn js_parse(&mut self, rebinds: Option<Vec<Rebind>>) {
        block_on(self.parse(false, rebinds));
    }

    /// Composes this instance
    #[wasm_bindgen(js_name = "compose")]
    pub async fn js_compose(&self, entrypoints: Vec<String>) -> Result<String, ComposeError> {
        self.compose(
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
        )
    }

    /// Composes a text as RainDocument with remote meta search enabled for parsing
    #[wasm_bindgen(js_name = "composeTextAsync")]
    pub async fn js_compose_text_async(
        text: &str,
        entrypoints: Vec<String>,
        meta_store: &MetaStore,
        rebinds: Option<Vec<Rebind>>,
    ) -> Result<String, ComposeError> {
        RainDocument::compose_text_async(
            text,
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
            Some(meta_store.0.clone()),
            rebinds,
        )
        .await
    }

    /// Composes a text as RainDocument with remote meta search disabled for parsing
    #[wasm_bindgen(js_name = "composeText")]
    pub async fn js_compose_text(
        text: &str,
        entrypoints: Vec<String>,
        meta_store: &MetaStore,
        rebinds: Option<Vec<Rebind>>,
    ) -> Result<String, ComposeError> {
        RainDocument::compose_text(
            text,
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
            Some(meta_store.0.clone()),
            rebinds,
        )
    }
}

impl VectorIntoWasmAbi for Rebind {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    fn vector_into_abi(vector: Box<[Self]>) -> Self::Abi {
        js_value_vector_into_abi(vector)
    }
}
impl From<Rebind> for JsValue {
    fn from(value: Rebind) -> Self {
        to_value(&value).unwrap_throw()
    }
}
impl TryFromJsValue for Rebind {
    type Error = Error;
    fn try_from_js_value(value: JsValue) -> Result<Self, Self::Error> {
        from_value(value)
    }
}
impl VectorFromWasmAbi for Rebind {
    type Abi = <Box<[JsValue]> as IntoWasmAbi>::Abi;
    unsafe fn vector_from_abi(js: Self::Abi) -> Box<[Self]> {
        js_value_vector_from_abi(js)
    }
}
impl WasmDescribeVector for Rebind {
    fn describe_vector() {
        inform(VECTOR);
        Rebind::describe();
    }
}
