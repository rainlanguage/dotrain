use lsp_types::Url;
use wasm_bindgen::prelude::*;
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

// #[wasm_bindgen(typescript_custom_section)]
// const TYPESCRIPT_DEFINITIONS: &'static str = r#"export class RainDocument {
//   free(): void;
//   /**
//    * Get all problems of this RainDocument instance
//    */
//   readonly allProblems: any;
//   /**
//    */
//   readonly authoringMeta: any;
//   /**
//    * Get the expression problems of this RainDocument instance
//    */
//   readonly bindingProblems: any;
//   /**
//    */
//   readonly bindings: any;
//   /**
//    */
//   readonly bytecode: Uint8Array;
//   /**
//    */
//   readonly comments: any;
//   /**
//    */
//   readonly ignoreUndefinedWords: boolean;
//   /**
//    *
//    */
//   readonly ignoreWords: boolean;
//   /**
//    *
//    */
//   readonly imports: any;
//   /**
//    */
//   readonly metaStore: MetaStore;
//   /**
//    */
//   readonly namespace: any;
//   /**
//    */
//   readonly problems: any;
//   /**
//    */
//   readonly runtimeError: string | undefined;
//   /**
//    * Get the current text of this RainDocument instance
//    */
//   readonly text: string;
//   /**
//    * Get the current text of this RainDocument instance
//    */
//   readonly uri: string;
//   /**
//    * Get the current text of this RainDocument instance
//    */
//   readonly version: number;
//   /**
//    * creates an instance and parses with searching for metas from remote
//    * @param {string} text
//    * @param {string} uri
//    * @param {MetaStore | undefined} [meta_store]
//    * @returns {Promise<RainDocument>}
//    */
//   static createAsync(text: string, uri: string, meta_store?: MetaStore): Promise<RainDocument>;
//   /**
//    * creates an instance and parses with only cached metas
//    * @param {string} text
//    * @param {string} uri
//    * @param {MetaStore | undefined} [meta_store]
//    * @returns {RainDocument}
//    */
//   static create(text: string, uri: string, meta_store?: MetaStore): RainDocument;
//   /**
//    * Updates the TextDocument of this RainDocument instance with new text
//    * @param {string} new_text
//    */
//   updateText(new_text: string): void;
//   /**
//    * Updates the TextDocument of this RainDocument instance with new text
//    * @param {string} new_text
//    * @param {string} uri
//    * @param {number} version
//    */
//   update(new_text: string, uri: string, version: number): void;
//   /**
//    * Updates the TextDocument of this RainDocument instance with new text
//    * @param {string} new_text
//    * @returns {Promise<void>}
//    */
//   updateTextAsync(new_text: string): Promise<void>;
//   /**
//    * Updates the TextDocument of this RainDocument instance with new text
//    * @param {string} new_text
//    * @param {string} uri
//    * @param {number} version
//    * @returns {Promise<void>}
//    */
//   updateAsync(new_text: string, uri: string, version: number): Promise<void>;
//   /**
//    * Parses this instance of RainDocument async by searching for remote metas
//    * @returns {Promise<void>}
//    */
//   parseAsync(): Promise<void>;
//   /**
//    * Parses this instance of RainDocument sync with only cached metas
//    */
//   parse(): void;
// }"#;

#[wasm_bindgen]
impl RainDocument {
    /// creates an instance and parses with searching for metas from remote
    #[wasm_bindgen(js_name = "createAsync")]
    pub async fn js_create_async(text: &str, uri: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create_async(
            text.to_string(),
            Url::parse(uri).unwrap_throw(),
            Some(meta_store.0.clone()),
        )
        .await
    }
    /// creates an instance and parses with searching for metas from remote
    #[wasm_bindgen(js_name = "createAsyncRaw")]
    pub async fn js_create_async_raw(text: &str, uri: &str) -> RainDocument {
        RainDocument::create_async(text.to_string(), Url::parse(uri).unwrap_throw(), None).await
    }

    /// creates an instance and parses with only cached metas
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(text: &str, uri: &str, meta_store: &MetaStore) -> RainDocument {
        RainDocument::create(
            text.to_string(),
            Url::parse(uri).unwrap_throw(),
            Some(meta_store.0.clone()),
        )
    }
    /// creates an instance and parses with only cached metas
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

    /// Updates the TextDocument of this RainDocument instance with new text
    #[wasm_bindgen(js_name = "updateText")]
    pub fn js_update_text(&mut self, new_text: &str) {
        self.update_text(new_text.to_string());
    }

    /// Updates the TextDocument of this RainDocument instance with new text
    #[wasm_bindgen(js_name = "update")]
    pub fn js_update(&mut self, new_text: &str, uri: &str, version: usize) {
        self.update(
            new_text.to_string(),
            Url::parse(uri).unwrap_throw(),
            version,
        )
    }

    /// Updates the TextDocument of this RainDocument instance with new text
    #[wasm_bindgen(js_name = "updateTextAsync")]
    pub async fn js_update_text_async(&mut self, new_text: &str) {
        self.update_text_async(new_text.to_string()).await;
    }

    /// Updates the TextDocument of this RainDocument instance with new text
    #[wasm_bindgen(js_name = "updateAsync")]
    pub async fn js_update_async(&mut self, new_text: &str, uri: &str, version: usize) {
        self.update_async(
            new_text.to_string(),
            Url::parse(uri).unwrap_throw(),
            version,
        )
        .await;
    }

    /// Get the current text of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "text")]
    pub fn js_text(&self) -> String {
        self.text.clone()
    }

    /// Get the current text of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "uri")]
    pub fn js_uri(&self) -> String {
        self.uri.to_string()
    }

    /// Get the current text of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "version")]
    pub fn js_version(&self) -> usize {
        self.version
    }

    #[wasm_bindgen(getter, js_name = "problems")]
    pub fn js_problems(&self) -> Vec<Problem> {
        self.problems.clone()
    }

    #[wasm_bindgen(getter, js_name = "comments")]
    pub fn js_comments(&self) -> Vec<Comment> {
        self.comments.clone()
    }

    #[wasm_bindgen(getter, js_name = "imports")]
    pub fn js_imports(&self) -> Vec<Import> {
        self.imports.clone()
    }

    #[wasm_bindgen(getter, js_name = "bindings")]
    pub fn js_bindings(&self) -> Vec<Binding> {
        self.bindings.clone()
    }

    #[wasm_bindgen(getter, js_name = "namespace")]
    pub fn js_namespace(&self) -> Namespace {
        Namespace {
            obj: serde_wasm_bindgen::to_value(&self.namespace).unwrap_throw(),
        }
    }

    #[wasm_bindgen(getter, js_name = "metaStore")]
    pub fn js_store(&self) -> MetaStore {
        MetaStore(self.meta_store.clone())
    }

    #[wasm_bindgen(getter, js_name = "importDepth")]
    pub fn js_imports_depth(&self) -> usize {
        self.import_depth
    }

    #[wasm_bindgen(getter, js_name = "ignoreWords")]
    pub fn js_ignore_words(&self) -> bool {
        self.ignore_words
    }

    #[wasm_bindgen(getter, js_name = "ignoreUndefinedWords")]
    pub fn js_ignore_undefined_words(&self) -> bool {
        self.ignore_undefined_words
    }

    #[wasm_bindgen(getter, js_name = "authoringMeta")]
    pub fn js_authoring_meta(&self) -> Option<IAuthoringMeta> {
        if let Some(am) = &self.authoring_meta {
            Some(IAuthoringMeta {
                obj: serde_wasm_bindgen::to_value(am).unwrap_throw(),
            })
        } else {
            None
        }
    }

    #[wasm_bindgen(getter, js_name = "bytecode")]
    pub fn js_bytecode(&self) -> Vec<u8> {
        self.bytecode.clone()
    }

    #[wasm_bindgen(getter, js_name = "error")]
    pub fn js_runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// Get all problems of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "allProblems")]
    pub fn js_all_problems(&self) -> Vec<Problem> {
        self.all_problems().iter().map(|&v| v.clone()).collect()
    }

    /// Get the expression problems of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "bindingProblems")]
    pub fn js_bindings_problems(&self) -> Vec<Problem> {
        self.bindings_problems()
            .iter()
            .map(|&v| v.clone())
            .collect()
    }

    /// Parses this instance of RainDocument async by searching for remote metas
    #[wasm_bindgen(js_name = "parseAsync")]
    pub async fn js_parse_async(&mut self) {
        self.parse_async().await;
    }

    /// Parses this instance of RainDocument sync with only cached metas
    #[wasm_bindgen(js_name = "parse")]
    pub fn js_parse(&mut self) {
        self.parse();
    }

    #[wasm_bindgen(js_name = "compile")]
    pub async fn js_compile(
        &self,
        entrypoints: Vec<String>,
        min_outputs: Option<Vec<u8>>,
    ) -> Result<ExpressionConfig, RainDocumentCompileError> {
        self.compile(&entrypoints, None, min_outputs.as_deref())
    }
}
