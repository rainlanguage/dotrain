use wasm_bindgen::prelude::*;
use rain_meta::types::authoring::v1::AuthoringMeta;
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use super::super::{
    IRainlang, Namespace, IAuthoringMeta,
    compiler::ParseResult,
    parser::rainlang::Rainlang,
    types::ast::{Comment, Problem, RainlangSource, Namespace as Ns},
};

#[wasm_bindgen]
impl Rainlang {
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(
        text: &str,
        authoring_meta: Option<IAuthoringMeta>,
        namespace: Option<Namespace>,
    ) -> Rainlang {
        let opt_am = if let Some(iam) = authoring_meta {
            Some(from_js_value::<AuthoringMeta>(iam.obj).unwrap_throw())
        } else {
            None
        };
        let am = match &opt_am {
            Some(v) => Some(v),
            None => None,
        };
        let opt_ns = if let Some(n) = namespace {
            Some(from_js_value::<Ns>(n.obj).unwrap_throw())
        } else {
            None
        };
        let ns = match &opt_ns {
            Some(v) => Some(v),
            None => None,
        };
        Rainlang::create(text.to_string(), am, ns)
    }

    /// Updates the text of this Rainlang instance and parse it right after that
    #[wasm_bindgen(js_name = "update")]
    pub fn js_update(
        &mut self,
        new_text: &str,
        authoring_meta: Option<IAuthoringMeta>,
        namespace: Option<Namespace>,
    ) {
        let opt_am = if let Some(iam) = authoring_meta {
            Some(from_js_value::<AuthoringMeta>(iam.obj).unwrap_throw())
        } else {
            None
        };
        let am = match &opt_am {
            Some(v) => Some(v),
            None => None,
        };
        let opt_ns = if let Some(n) = namespace {
            Some(from_js_value::<Ns>(n.obj).unwrap_throw())
        } else {
            None
        };
        let ns = match &opt_ns {
            Some(v) => Some(v),
            None => None,
        };
        self.update(new_text.to_string(), am, ns);
    }

    #[wasm_bindgen(js_name = "fromInterface")]
    pub fn from_interface(value: IRainlang) -> Rainlang {
        from_js_value::<Rainlang>(value.obj).unwrap_throw()
    }

    #[wasm_bindgen(js_name = "toInterface")]
    pub fn to_interface(&self) -> IRainlang {
        IRainlang {
            obj: to_js_value(self).unwrap_throw(),
        }
    }

    /// Get the current runtime error of this Rainlang instance
    #[wasm_bindgen(getter, js_name = "error")]
    pub fn js_get_runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// Get the current text of this RainDocument instance
    #[wasm_bindgen(getter, js_name = "text")]
    pub fn js_text(&self) -> String {
        self.text.clone()
    }

    #[wasm_bindgen(getter, js_name = "ast")]
    pub fn js_ast(&self) -> Vec<RainlangSource> {
        self.ast.clone()
    }

    #[wasm_bindgen(getter, js_name = "problems")]
    pub fn js_problems(&self) -> Vec<Problem> {
        self.problems.clone()
    }

    #[wasm_bindgen(getter, js_name = "comments")]
    pub fn js_comments(&self) -> Vec<Comment> {
        self.comments.clone()
    }

    #[wasm_bindgen(getter, js_name = "ignoreUndefinedAuthoringMeta")]
    pub fn js_ignore_undefined_authoring_meta(&self) -> bool {
        self.ignore_undefined_authoring_meta
    }

    #[wasm_bindgen(js_name = "compile")]
    pub async fn js_compile(
        &self,
        entrypoints: u8,
        bytecode: &[u8],
        min_outputs: Option<Vec<u8>>,
    ) -> Result<ParseResult, String> {
        match self.compile(entrypoints, bytecode, None, min_outputs.as_deref()) {
            Ok(v) => Ok(v),
            Err(e) => Err(e.to_string()),
        }
    }
}
