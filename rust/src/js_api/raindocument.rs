use lsp_types::Url;
use wasm_bindgen::prelude::*;
use crate::INPE2Deployer;

use super::{
    store::MetaStore,
    super::{
        Namespace, IRainDocument, IAuthoringMeta,
        parser::raindocument::RainDocument,
        compiler::RainDocumentCompileError,
        types::{
            ExpressionConfig,
            ast::{Problem, Import, Comment, Binding},
        },
    },
};

#[wasm_bindgen]
impl RainDocument {
    /// Creates an instance with the given MetaStore and parses with remote meta search enabled
    #[wasm_bindgen(js_name = "createAsync")]
    pub async fn js_create_async(text: &str, uri: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create_async(
            text.to_string(),
            Url::parse(uri).unwrap_throw(),
            Some(meta_store.0.clone()),
        )
        .await
    }

    /// creates an instance with a new raw MetaStore and parses with searching for metas from remote
    #[wasm_bindgen(js_name = "createAsyncRaw")]
    pub async fn js_create_async_raw(text: &str, uri: &str) -> RainDocument {
        RainDocument::create_async(text.to_string(), Url::parse(uri).unwrap_throw(), None).await
    }

    /// Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(text: &str, uri: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create(
            text.to_string(),
            Url::parse(uri).unwrap_throw(),
            Some(meta_store.0.clone()),
        )
    }

    /// Creates an instance with a new raw MetaStore and parses with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "createRaw")]
    pub fn js_create_raw(text: &str, uri: &str) -> RainDocument {
        RainDocument::create(text.to_string(), Url::parse(uri).unwrap_throw(), None)
    }

    #[wasm_bindgen(js_name = "fromInterface")]
    pub fn from_interface(value: &IRainDocument, meta_store: &MetaStore) -> RainDocument {
        let mut rd =
            serde_wasm_bindgen::from_value::<RainDocument>(value.obj.clone()).unwrap_throw();
        rd.meta_store = meta_store.0.clone();
        rd
    }
    #[wasm_bindgen(js_name = "fromInterfaceRaw")]
    pub fn from_interface_raw(value: IRainDocument) -> RainDocument {
        serde_wasm_bindgen::from_value::<RainDocument>(value.obj).unwrap_throw()
    }

    #[wasm_bindgen(js_name = "toInterface")]
    pub fn to_interface(&self) -> IRainDocument {
        IRainDocument {
            obj: serde_wasm_bindgen::to_value(&self).unwrap_throw(),
        }
    }

    /// Updates the text and parses right away with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "updateText")]
    pub fn js_update_text(&mut self, new_text: &str) {
        self.update_text(new_text.to_string());
    }

    /// Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "update")]
    pub fn js_update(&mut self, new_text: &str, uri: &str, version: usize) {
        self.update(
            new_text.to_string(),
            Url::parse(uri).unwrap_throw(),
            version,
        )
    }

    /// Updates the text and parses right away with remote meta search enabled
    #[wasm_bindgen(js_name = "updateTextAsync")]
    pub async fn js_update_text_async(&mut self, new_text: &str) {
        self.update_text_async(new_text.to_string()).await;
    }

    /// Updates the text, uri, version and parses right away with remote meta search enabled
    #[wasm_bindgen(js_name = "updateAsync")]
    pub async fn js_update_async(&mut self, new_text: &str, uri: &str, version: usize) {
        self.update_async(
            new_text.to_string(),
            Url::parse(uri).unwrap_throw(),
            version,
        )
        .await;
    }

    /// This instance's current text
    #[wasm_bindgen(getter, js_name = "text")]
    pub fn js_text(&self) -> String {
        self.text.clone()
    }

    /// This instance's current URI
    #[wasm_bindgen(getter, js_name = "uri")]
    pub fn js_uri(&self) -> String {
        self.uri.to_string()
    }

    /// This instance's current version
    #[wasm_bindgen(getter, js_name = "version")]
    pub fn js_version(&self) -> usize {
        self.version
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

    /// If 'ignore_words' lint option is enabled or not
    #[wasm_bindgen(getter, js_name = "ignoreWords")]
    pub fn js_ignore_words(&self) -> bool {
        self.ignore_words
    }

    /// If 'ignore_undefined_words' lint option is enabled or not
    #[wasm_bindgen(getter, js_name = "ignoreUndefinedWords")]
    pub fn js_ignore_undefined_words(&self) -> bool {
        self.ignore_undefined_words
    }

    /// This instance's AuthoringMeta
    #[wasm_bindgen(getter, js_name = "authoringMeta")]
    pub fn js_authoring_meta(&self) -> Option<IAuthoringMeta> {
        if let Some(am) = &self.authoring_meta {
            Some(IAuthoringMeta {
                obj: serde_wasm_bindgen::to_value(am).unwrap_or(JsValue::UNDEFINED),
            })
        } else {
            None
        }
    }

    /// This instance's NPE2 Deployer details
    #[wasm_bindgen(getter, js_name = "deployer")]
    pub fn js_deployer(&self) -> INPE2Deployer {
        if self.deployer.is_corrupt() {
            INPE2Deployer {
                obj: JsValue::UNDEFINED,
            }
        } else {
            INPE2Deployer {
                obj: serde_wasm_bindgen::to_value(&self.deployer).unwrap_or(JsValue::UNDEFINED),
            }
        }
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
        self.parse_async().await;
    }

    /// Parses this instance's text with remote meta search disabled (cached metas only)
    #[wasm_bindgen(js_name = "parse")]
    pub fn js_parse(&mut self) {
        self.parse();
    }

    /// Compiles this instance
    #[wasm_bindgen(js_name = "compile")]
    pub async fn js_compile(
        &self,
        entrypoints: Vec<String>,
    ) -> Result<ExpressionConfig, RainDocumentCompileError> {
        self.compile(&entrypoints, None)
    }
}
