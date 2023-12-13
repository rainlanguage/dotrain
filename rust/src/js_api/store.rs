use serde::Serialize;
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use rain_meta::{Store, search, search_deployer};
use std::{
    sync::{Arc, RwLock},
    collections::HashMap,
};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value, Serializer};

#[wasm_bindgen(typescript_custom_section)]
const META_STORE_TYPESCRIPT_DEFINITIONS: &'static str = r#"export class MetaStore {
  free(): void;

  /**
   * abcdgh
   */
  static create(
    subgraphs: string[],
    cache: Record<string, Uint8Array>,
    authoringCache: Record<string, Uint8Array>,
    dotrainCache: Record<string, string>,
    includeRainSubgraphs: boolean
  ): MetaStore;

  /**
   * abcdgh
   */
  constructor();

  /**
   * abcdgh
   */
  readonly subgraphs: string[];
  /**
   * abcdgh
   */
  readonly cache: Record<string, Uint8Array>;
  /**
   * abcdgh
   */
  readonly dotrainCache: Record<string, string>;
  /**
   * abcdgh
   */
  readonly authoringCache: Record<string, Uint8Array>;

  /**
   * abcdgh
   */
  merge(other: MetaStore): void;
  /**
   * abcdgh
   */
  addSubgraphs(subgraphs: string[]): void;
  /**
   * abcdgh
   */
  getMeta(hash: string): Uint8Array | undefined;
  /**
   * abcdgh
   */
  getDotrainHash(uri: string): string | undefined;
  /**
   * abcdgh
   */
  getDotrainUri(hash: string): string | undefined;
  /**
   * abcdgh
   */
  getDotrainMeta(uri: string): Uint8Array | undefined;
  /**
   * abcdgh
   */
  deleteDotrain(uri: string, keep_meta: boolean): void;
  /**
   * abcdgh
   */
  getAuthoringMeta(hash: string): Uint8Array | undefined;
  /**
   * abcdgh
   */
  setDotrain(text: string, uri: string, keep_old: boolean): string[];
  /**
   * abcdgh
   */
  updateWith(hash: string, bytes: Uint8Array): Uint8Array | undefined;

  /**
   * abcdgh
   */
  update(hash: string): Promise<Uint8Array | undefined>;
  /**
   * abcdgh
   */
  updateCheck(hash: string): Promise<Uint8Array | undefined>;
  /**
   * abcdgh
   */
  searchAuthoringMeta(deployer_hash: string): Promise<Uint8Array | undefined>;
  /**
   * abcdgh
   */
  searchAuthoringMetaCheck(authoring_meta_hash: string, deployer_hash: string): Promise<Uint8Array | undefined>;
}"#;

#[derive(Debug, Clone)]
#[wasm_bindgen(skip_typescript)]
pub struct MetaStore(pub(crate) Arc<RwLock<Store>>);

// #[wasm_bindgen]
// impl MetaStore {
//     /// creates a RainDocument instance with this MetaStore and parses with only cached metas
//     #[wasm_bindgen(skip_typescript, js_name = "createRainDocument")]
//     pub fn create_rain_document(&self, text: &str, uri: &str) -> RainDocument {
//         let meta_store = self.0.clone();
//         let mut rd = RainDocument::_new(text.to_string(), Url::parse(uri).unwrap_throw(), 0, Some(meta_store), 0);
//         rd.parse();
//         rd
//     }

//     /// creates a RainDocument instance with this MetaStore and parses with searching for metas from remote
//     #[wasm_bindgen(skip_typescript, js_name = "createRainDocumentAsync")]
//     pub async fn create_rain_document_async(&self, text: &str, uri: &str) -> RainDocument {
//         let meta_store = self.0.clone();
//         let mut rd = RainDocument::_new(text.to_string(), Url::parse(uri).unwrap_throw(), 0, Some(meta_store), 0);
//         rd.parse_async().await;
//         rd
//     }
// }

#[wasm_bindgen]
impl MetaStore {
    #[wasm_bindgen(skip_typescript, constructor)]
    pub fn new() -> MetaStore {
        MetaStore(Arc::new(RwLock::new(Store::default())))
    }

    /// creates new instance of Store with given initial values
    /// it checks the validity of each item of the provided values and only stores those that are valid
    #[wasm_bindgen(skip_typescript)]
    pub fn create(
        subgraphs: JsValue,
        cache: JsValue,
        authoring_cache: JsValue,
        dotrain_cache: JsValue,
        include_rain_subgraphs: JsValue,
    ) -> MetaStore {
        MetaStore(Arc::new(RwLock::new(Store::create(
            &from_js_value::<Vec<String>>(subgraphs).unwrap_throw(),
            &from_js_value::<HashMap<String, Vec<u8>>>(cache).unwrap_throw(),
            &from_js_value::<HashMap<String, Vec<u8>>>(authoring_cache).unwrap_throw(),
            &from_js_value::<HashMap<String, String>>(dotrain_cache).unwrap_throw(),
            from_js_value::<bool>(include_rain_subgraphs).unwrap_throw(),
        ))))
    }

    /// all subgraph endpoints in this instance
    #[wasm_bindgen(skip_typescript, getter)]
    pub fn subgraphs(&self) -> Vec<String> {
        self.0.read().unwrap().subgraphs().clone()
    }

    /// add new subgraph endpoints
    #[wasm_bindgen(skip_typescript, js_name = "addSubgraphs")]
    pub fn add_subgraphs(&mut self, subgraphs: JsValue) {
        self.0
            .write()
            .unwrap()
            .add_subgraphs(&from_js_value::<Vec<String>>(subgraphs).unwrap_throw());
    }

    /// getter method for the whole meta cache
    #[wasm_bindgen(skip_typescript, getter)]
    pub fn cache(&self) -> JsValue {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        self.0
            .read()
            .unwrap()
            .cache()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// getter method for the whole authoring meta cache
    #[wasm_bindgen(skip_typescript, js_name = "authoringCache", getter)]
    pub fn authoring_cache(&self) -> JsValue {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        self.0
            .read()
            .unwrap()
            .authoring_cache()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// getter method for the whole dotrain cache
    #[wasm_bindgen(skip_typescript, js_name = "dotrainCache", getter)]
    pub fn dotrain_cache(&self) -> JsValue {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        self.0
            .read()
            .unwrap()
            .dotrain_cache()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// get the corresponding meta bytes of the given hash if it exists
    #[wasm_bindgen(skip_typescript, js_name = "getMeta")]
    pub fn get_meta(&self, hash: &str) -> Option<Vec<u8>> {
        match self.0.read().unwrap().get_meta(hash) {
            Some(v) => Some(v.clone()),
            None => None,
        }
    }

    /// get the corresponding authoring meta bytes of the given hash if it exists
    #[wasm_bindgen(skip_typescript, js_name = "getAuthoringMeta")]
    pub fn get_authoring_meta(&self, hash: &str) -> Option<Vec<u8>> {
        match self.0.read().unwrap().get_authoring_meta(hash) {
            Some(v) => Some(v.clone()),
            None => None,
        }
    }

    /// getter method for the whole dotrain cache
    /// get the corresponding dotrain hash of the given dotrain uri if it exists
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainHash")]
    pub fn get_dotrain_hash(&self, uri: &str) -> Option<String> {
        match self.0.read().unwrap().get_dotrain_hash(uri) {
            Some(v) => Some(v.clone()),
            None => None,
        }
    }

    /// get the corresponding uri of the given dotrain hash if it exists
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainUri")]
    pub fn get_dotrain_uri(&self, hash: &str) -> Option<String> {
        match self.0.read().unwrap().get_dotrain_uri(hash) {
            Some(v) => Some(v.to_string()),
            None => None,
        }
    }

    /// get the corresponding meta bytes of the given dotrain uri if it exists
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainMeta")]
    pub fn get_dotrain_meta(&self, uri: &str) -> Option<Vec<u8>> {
        match self.0.read().unwrap().get_dotrain_meta(uri) {
            Some(v) => Some(v.clone()),
            None => None,
        }
    }

    /// searches for authoring meta in the subgraphs given the deployer hash
    #[wasm_bindgen(skip_typescript, js_name = "searchAuthoringMeta")]
    pub async fn search_authoring_meta(&mut self, deployer_hash: &str) -> Option<Uint8Array> {
        let subgraphs = self.0.read().unwrap().subgraphs().clone();
        match search_deployer(deployer_hash, &subgraphs).await {
            Ok(res) => {
                if let Some(m) = self.0.write().unwrap().update_with(&res.hash, &res.bytes) {
                    match to_js_value(m) {
                        Ok(v) => return Some(Uint8Array::from(v)),
                        Err(_) => return None,
                    }
                }
                None
            }
            Err(_e) => None,
        }
    }

    /// if the authoring meta already is cached it returns it immediately else
    /// searches for authoring meta in the subgraphs given the deployer hash
    #[wasm_bindgen(skip_typescript, js_name = "searchAuthoringMetaCheck")]
    pub async fn search_authoring_meta_check(
        &mut self,
        authoring_meta_hash: &str,
        deployer_hash: &str,
    ) -> Option<Uint8Array> {
        if let Some(v) = self
            .0
            .read()
            .unwrap()
            .get_authoring_meta(authoring_meta_hash)
        {
            match to_js_value(v) {
                Ok(e) => return Some(Uint8Array::from(e)),
                Err(_) => return None,
            }
        } else {
            let subgraphs = self.0.read().unwrap().subgraphs().clone();
            match search_deployer(deployer_hash, &subgraphs).await {
                Ok(res) => {
                    if let Some(m) = self.0.write().unwrap().update_with(&res.hash, &res.bytes) {
                        match to_js_value(m) {
                            Ok(v) => return Some(Uint8Array::from(v)),
                            Err(_) => return None,
                        }
                    }
                    None
                }
                Err(_e) => None,
            }
        }
    }

    /// updates the meta cache by searching through all subgraphs for the given hash
    /// returns the reference to the meta bytes in the cache if it was found
    #[wasm_bindgen(skip_typescript)]
    pub async fn update(&mut self, hash: &str) -> Option<Uint8Array> {
        let subgraphs = self.0.read().unwrap().subgraphs().clone();
        match search(hash, &subgraphs).await {
            Ok(res) => {
                if let Some(m) = self.0.write().unwrap().update_with(hash, &res.bytes) {
                    match to_js_value(m) {
                        Ok(v) => return Some(Uint8Array::from(v)),
                        Err(_) => return None,
                    }
                }
                None
            }
            Err(_e) => None,
        }
    }

    /// first checks if the meta is stored, if not will perform update()
    #[wasm_bindgen(skip_typescript, js_name = "updateCheck")]
    pub async fn update_check(&mut self, hash: &str) -> Option<Uint8Array> {
        if let Some(v) = self.0.read().unwrap().get_meta(hash) {
            match to_js_value(v) {
                Ok(e) => return Some(Uint8Array::from(e)),
                Err(_) => return None,
            }
        } else {
            let subgraphs = self.0.read().unwrap().subgraphs().clone();
            match search(hash, &subgraphs).await {
                Ok(res) => {
                    if let Some(m) = self.0.write().unwrap().update_with(hash, &res.bytes) {
                        match to_js_value(m) {
                            Ok(v) => return Some(Uint8Array::from(v)),
                            Err(_) => return None,
                        }
                    }
                    None
                }
                Err(_e) => None,
            }
        }
    }

    /// updates the meta cache by the given hash and meta bytes, checks the hash to bytes
    /// validity returns the reference to the bytes if the updated meta bytes contained any
    #[wasm_bindgen(skip_typescript, js_name = "updateWith")]
    pub fn update_with(&mut self, hash: &str, bytes: &[u8]) -> Option<Vec<u8>> {
        self.0.write().unwrap().update_with(hash, bytes);
        Some(bytes.to_vec())
    }

    /// deletes a dotrain record given a uri
    #[wasm_bindgen(skip_typescript, js_name = "deleteDotrain")]
    pub fn delete_dotrain(&mut self, uri: &str, keep_meta: bool) {
        self.0.write().unwrap().delete_dotrain(uri, keep_meta);
    }

    /// stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
    /// and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in
    /// the scope of Store and handling and passing on a correct URI (path) for the given text must be handled
    /// externally by the implementer
    #[wasm_bindgen(skip_typescript, js_name = "setDotrain")]
    pub fn set_dotrain(
        &mut self,
        text: &str,
        uri: &str,
        keep_old: bool,
    ) -> Result<JsValue, JsError> {
        match self.0.write().unwrap().set_dotrain(text, uri, keep_old) {
            Ok(v) => match to_js_value(&v) {
                Ok(e) => Ok(e),
                Err(e) => Err(JsError::new(&e.to_string())),
            },
            Err(e) => Err(JsError::new(&e.to_string())),
        }
    }

    /// lazilly merges another Store to the current one, avoids duplicates
    #[wasm_bindgen(skip_typescript)]
    pub fn merge(&mut self, other: &MetaStore) -> Result<(), JsError> {
        let store = if let Some(rw) = Arc::into_inner(other.0.clone()) {
            match rw.into_inner() {
                Ok(s) => s,
                Err(_e) => return Err(JsError::new("could not merge")),
            }
        } else {
            return Err(JsError::new("could not merge"));
        };
        self.0.write().unwrap().merge(&store);
        Ok(())
    }
}
