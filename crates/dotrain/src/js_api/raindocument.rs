use wasm_bindgen::prelude::*;
use futures::executor::block_on;
use super::{
    store::MetaStore,
    Namespace, IRainDocument, IAuthoringMeta,
    super::{
        parser::raindocument::RainDocument,
        error::ComposeError,
        types::ast::{Problem, Import, Comment, Binding},
    },
};

#[wasm_bindgen]
impl RainDocument {
    /// Creates an instance with the given MetaStore and parses with remote meta search enabled
    #[wasm_bindgen(js_name = "createAsync")]
    pub async fn js_create_async(text: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create_async(text.to_string(), Some(meta_store.0.clone()), None, None).await
    }

    /// Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(text: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create(text.to_string(), Some(meta_store.0.clone()), None, None)
    }

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

    /// Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "update")]
    pub fn js_update(&mut self, new_text: &str) {
        self.update(new_text.to_string(), None)
    }

    /// Updates the text, uri, version and parses right away with remote meta search enabled
    #[wasm_bindgen(js_name = "updateAsync")]
    pub async fn js_update_async(&mut self, new_text: &str) {
        self.update_async(new_text.to_string(), None).await;
    }

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
    pub async fn js_parse_async(&mut self) {
        self.parse(true, None).await;
    }

    /// Parses this instance's text with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "parse")]
    pub fn js_parse(&mut self) {
        block_on(self.parse(false, None));
    }

    /// Compiles this instance
    #[wasm_bindgen(js_name = "compose")]
    pub fn js_compose(&self, entrypoints: Vec<String>) -> Result<String, ComposeError> {
        self.compose(
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
        )
    }

    /// Compiles a text as RainDocument with remote meta search enabled for parsing
    #[wasm_bindgen(js_name = "composeTextAsync")]
    pub async fn js_compile_text_async(
        text: &str,
        entrypoints: Vec<String>,
        meta_store: &MetaStore,
    ) -> Result<String, ComposeError> {
        RainDocument::compose_text_async(
            text,
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
            Some(meta_store.0.clone()),
            None
        )
        .await
    }

    /// Compiles a text as RainDocument with remote meta search disabled for parsing
    #[wasm_bindgen(js_name = "composeText")]
    pub async fn js_compile_text(
        text: &str,
        entrypoints: Vec<String>,
        meta_store: &MetaStore,
    ) -> Result<String, ComposeError> {
        RainDocument::compose_text(
            text,
            &entrypoints
                .iter()
                .map(|v| v.as_str())
                .collect::<Vec<&str>>(),
            Some(meta_store.0.clone()),
            None
        )
    }
}
