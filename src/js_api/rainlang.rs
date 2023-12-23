use wasm_bindgen::prelude::*;
use rain_meta::{types::authoring::v1::AuthoringMeta, NPE2Deployer};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use crate::INPE2Deployer;

use super::super::{
    IRainlangDocument, Namespace, IAuthoringMeta,
    compiler::ParseResult,
    parser::rainlang::RainlangDocument,
    types::ast::{Comment, Problem, RainlangSource, Namespace as Ns},
};

#[wasm_bindgen]
impl RainlangDocument {
    /// Creates a new instance
    #[wasm_bindgen(js_name = "create")]
    pub fn js_create(
        text: &str,
        authoring_meta: Option<IAuthoringMeta>,
        namespace: Option<Namespace>,
    ) -> RainlangDocument {
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
        RainlangDocument::create(text.to_string(), am, ns)
    }

    /// Updates the text of this instance and parses it right away
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

    /// Creates an instance from interface object
    #[wasm_bindgen(js_name = "fromInterface")]
    pub fn from_interface(value: IRainlangDocument) -> RainlangDocument {
        from_js_value::<RainlangDocument>(value.obj).unwrap_throw()
    }

    /// Creates an interface object from this instance
    #[wasm_bindgen(js_name = "toInterface")]
    pub fn to_interface(&self) -> IRainlangDocument {
        IRainlangDocument {
            obj: to_js_value(self).unwrap_throw(),
        }
    }

    /// The error msg if parsing resulted in an error
    #[wasm_bindgen(getter, js_name = "error")]
    pub fn js_get_runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// This instance's text
    #[wasm_bindgen(getter, js_name = "text")]
    pub fn js_text(&self) -> String {
        self.text.clone()
    }

    /// This instance's parse tree (AST)
    #[wasm_bindgen(getter, js_name = "ast")]
    pub fn js_ast(&self) -> Vec<RainlangSource> {
        self.ast.clone()
    }

    /// This instance's problems
    #[wasm_bindgen(getter, js_name = "problems")]
    pub fn js_problems(&self) -> Vec<Problem> {
        self.problems.clone()
    }

    /// This instance's comments
    #[wasm_bindgen(getter, js_name = "comments")]
    pub fn js_comments(&self) -> Vec<Comment> {
        self.comments.clone()
    }

    /// Compiles this instance's text given the entrypoints and INPE2Deployer
    #[wasm_bindgen(js_name = "compile")]
    pub async fn js_compile(&self, deployer: INPE2Deployer) -> Result<ParseResult, JsValue> {
        let deployer: NPE2Deployer = from_js_value(deployer.obj).unwrap_throw();
        match self.compile(&deployer, None) {
            Ok(v) => Ok(v),
            Err(e) => Err(e.to_string().into()),
        }
    }
}
