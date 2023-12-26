use tsify::Tsify;
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use super::DeployerQueryResponse;
use serde::{Serialize, Deserialize};
use std::{
    sync::{Arc, RwLock},
    collections::HashMap,
};
use rain_meta::{Store, search, search_deployer, NPE2Deployer, DeployerNPResponse};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value, Serializer};

// a wrapper struct for &[u8] to be serialized as Uint8Array from rust -> wasm -> js
struct ToUint8ArraySerializer<'a>(&'a [u8]);
impl<'a> Serialize for ToUint8ArraySerializer<'a> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_bytes(&self.0)
    }
}

// Typescript definitions of MetaStore
#[wasm_bindgen(typescript_custom_section)]
const META_STORE_TYPESCRIPT_DEFINITIONS: &'static str = r#"/**
* In-memory CAS (content addressed storage) for all metadata required for parsing
* a RainDocument which basically stores k/v pairs of meta hash, meta bytes and 
* ExpressionDeployer reproducible data as well as providing functionalities to easliy 
* read them from the CAS.
* 
* Hashes are 32 bytes (in hex string format) and will be stored as lower case and
* meta bytes are valid cbor encoded as Uint8Array. ExpressionDeployers data are in
* form of js object mapped to deployedBytecode meta hash and deploy transaction hash.
* 
* @example
* ```typescript
* // to instantiate with including default subgraphs
* // pass 'false' to not include default rain subgraph endpoints
* const store = new MetaStore();
* 
* // or to instantiate with initial arguments
* const store = MetaStore.create(options);
* 
* // add a new subgraph endpoint URLs
* store.addSubgraphs(["sg-url-1", "sg-url-2", ...])
* 
* // merge another MetaStore instance to this instance
* store.merge(anotherMetaStore)
* 
* // updates the meta store with a new meta by searching through subgraphs
* await store.update(hash)
* 
* // to get a meta bytes of a corresponding hash from store
* const meta = store.getMeta(hash);
* ```
*/
export class MetaStore {
  free(): void;

  /**
   * Creates new instance of Store with given initial values,
   * it checks the validity of each item and only stores those that are valid
   * @param {MetaStoreOptions} options - initial values
   * @returns {MetaStore}
   */
  static create(options: MetaStoreOptions): MetaStore;

  /**
   * Constructs a new instance
   * @param include_rain_subgraphs - (optional) if default Rain subgraphs should be included
   */
  constructor(include_rain_subgraphs?: boolean);

  /**
   * All subgraph endpoint URLs of this instance
   */
  readonly subgraphs: string[];
  /**
   * All the cached meta hash/bytes pairs
   */
  readonly cache: Record<string, Uint8Array>;
  /**
   * All the cached dotrain uri/meta hash pairs
   */
  readonly dotrainCache: Record<string, string>;
  /**
   * All the cached NPE2 deployers
   */
  readonly deployerCache: Record<string, INPE2Deployer>;

  /**
   * Merges another instance of MetaStore to this instance lazily, avoids duplicates
   * @param {MetaStore} other
   */
  merge(other: MetaStore): void;
  /**
   * Adds new subgraph endpoints
   * @param {string[]} subgraphs
   */
  addSubgraphs(subgraphs: string[]): void;
  /**
   * Get the corresponding meta bytes of the given hash if it is cached
   * @param {string} hash
   * @returns {Uint8Array | undefined}
   */
  getMeta(hash: string): Uint8Array | undefined;
  /**
   * Get the corresponding dotrain hash of the given dotrain uri if it is cached
   * @param {string} uri
   * @returns {string | undefined}
   */
  getDotrainHash(uri: string): string | undefined;
  /**
   * Get the corresponding uri of the given dotrain hash if it is cached
   * @param {string} hash
   * @returns {string | undefined}
   */
  getDotrainUri(hash: string): string | undefined;
  /**
   * Get the corresponding meta bytes of the given dotrain uri if it is cached
   * @param {string} uri
   * @returns {Uint8Array | undefined}
   */
  getDotrainMeta(uri: string): Uint8Array | undefined;
  /**
   * Deletes a dotrain record given its uri
   * @param {string} uri
   */
  deleteDotrain(uri: string, keep_meta: boolean): void;
  /**
   * Get the NPE2 deployer details of the given deployer bytecode hash if it is cached
   * @param {string} hash
   * @returns {INPE2Deployer | undefined}
   */
  getDeployer(hash: string): INPE2Deployer | undefined;
  /**
   * Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
   * and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in
   * the scope of MetaStore and handling and passing on a correct URI for the given text must be handled
   * externally by the implementer
   * @param {string} text
   * @param {string} uri
   * @param {boolean} keep_old - keeps the old dotrain meta in the cache
   * @returns {string[]} new hash and old hash if the given uri was already cached
   */
  setDotrain(text: string, uri: string, keep_old: boolean): string[];
  /**
   * Sets deployer record
   * @param {string} deployer_bytecode_hash
   * @param {DeployerQueryResponse} deployer_response
   */
  setDeployer(deployer_response: DeployerQueryResponse): INPE2Deployer;
  /**
   * Updates the meta cache by the given hash and meta bytes, checks the hash to bytes validity
   * @param {string} hash
   * @param {Uint8Array} bytes
   */
  updateWith(hash: string, bytes: Uint8Array): void;
  /**
   * Updates the meta cache by searching through all subgraphs for the given hash
   * @param {string} hash
   * @returns {Promise<Uint8Array | undefined>}
   */
  update(hash: string): Promise<Uint8Array | undefined>;
  /**
   * First checks if the meta is stored and returns it if so, else will perform update()
   * @param {string} hash
   * @returns {Promise<Uint8Array | undefined>}
   */
  updateCheck(hash: string): Promise<Uint8Array | undefined>;
  /**
   * Searches for NPE2 deployer details in the subgraphs given the deployer hash
   * @param {string} hash
   * @returns {Promise<INPE2Deployer | undefined>}
   */
  searchDeployer(hash: string): Promise<INPE2Deployer | undefined>;
  /**
   * If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer()
   * @param {string} hash
   * @returns {Promise<INPE2Deployer | undefined>}
   */
  searchDeployerCheck(hash: string): Promise<INPE2Deployer | undefined>;
}"#;

/// Options for instantiating MetaStore with initial values
#[derive(Debug, Serialize, Deserialize, Clone, Tsify)]
#[serde(rename_all = "camelCase")]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MetaStoreOptions {
    #[serde(default)]
    #[tsify(optional)]
    pub subgraphs: Vec<String>,
    #[serde(default)]
    #[tsify(optional, type = "Record<string, Uint8Array>")]
    pub cache: HashMap<String, Vec<u8>>,
    #[serde(default)]
    #[tsify(optional, type = "Record<string, INPE2Deployer>")]
    pub deployer_cache: HashMap<String, NPE2Deployer>,
    #[serde(default)]
    #[tsify(optional, type = "Record<string, string>")]
    pub dotrain_cache: HashMap<String, String>,
    #[serde(default = "_true")]
    #[tsify(optional)]
    pub include_rain_subgraphs: bool,
}

fn _true() -> bool {
    true
}

#[cfg_attr(
    not(target_family = "wasm"),
    doc = r#"Wrapper for `Arc<RwLock<Store>>` for js/ts API
    
A wasm-bindgen wrapper struct for `Arc<RwLock<Store>>` in order to provide an 
easy API in Typescript/Javascript to instantiate and interact with all the 
methods and functionalities of a [Store] struct (meta CAS) and sharing it 
between different instances of RainDocument the way it is convenient in
Typescript/Javascript while Rust side keep handling the read/write locks"#
)]
#[cfg_attr(
    target_family = "wasm",
    doc = " In-memory CAS (content addressed storage) for all metadata required for parsing
 a RainDocument which basically stores k/v pairs of meta hash, meta bytes and 
 ExpressionDeployer reproducible data as well as providing functionalities to easliy 
 read them from the CAS.
 
 Hashes are 32 bytes (in hex string format) and will be stored as lower case and
 meta bytes are valid cbor encoded as Uint8Array. ExpressionDeployers data are in
 form of js object mapped to deployedBytecode meta hash and deploy transaction hash.
 
 @example
 ```javascript
 // to instantiate with including default subgraphs
 // pass 'false' to not include default rain subgraph endpoints
 const store = new MetaStore();
 
 // or to instantiate with initial arguments
 const store = MetaStore.create(options);
 
 // add a new subgraph endpoint URLs
 store.addSubgraphs([\"sg-url-1\", \"sg-url-2\", ...])
 
 // merge another MetaStore instance to this instance
 store.merge(anotherMetaStore)
 
 // updates the meta store with a new meta by searching through subgraphs
 await store.update(hash)
 
 // to get a meta bytes of a corresponding hash from store
 const meta = store.getMeta(hash);
 ```
"
)]
#[derive(Debug, Clone)]
#[wasm_bindgen(skip_typescript)]
pub struct MetaStore(pub(crate) Arc<RwLock<Store>>);

#[wasm_bindgen]
impl MetaStore {
    /// Constructs a new instance
    #[wasm_bindgen(skip_typescript, constructor)]
    pub fn new(include_rain_subgraphs: Option<bool>) -> MetaStore {
        if let Some(include_sgs) = include_rain_subgraphs {
            if include_sgs {
                MetaStore(Arc::new(RwLock::new(Store::default())))
            } else {
                MetaStore(Arc::new(RwLock::new(Store::new())))
            }
        } else {
            MetaStore(Arc::new(RwLock::new(Store::default())))
        }
    }

    /// Creates new instance of Store with given initial values
    /// it checks the validity of each item of the provided values and only stores those that are valid
    #[wasm_bindgen(skip_typescript)]
    pub fn create(options: MetaStoreOptions) -> MetaStore {
        MetaStore(Arc::new(RwLock::new(Store::create(
            &options.subgraphs,
            &options.cache,
            &options.deployer_cache,
            &options.dotrain_cache,
            options.include_rain_subgraphs,
        ))))
    }

    /// All subgraph endpoint URLs of this instance
    #[wasm_bindgen(skip_typescript, getter)]
    pub fn subgraphs(&self) -> Vec<String> {
        self.0.read().unwrap().subgraphs().clone()
    }

    /// All the cached meta hash/bytes pairs
    #[wasm_bindgen(skip_typescript, getter)]
    pub fn cache(&self) -> JsValue {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        self.0
            .read()
            .unwrap()
            .cache()
            .iter()
            .map(|(key, value)| (key, ToUint8ArraySerializer(value)))
            .collect::<HashMap<&String, ToUint8ArraySerializer>>()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// All the cached NPE2 deployers
    #[wasm_bindgen(skip_typescript, js_name = "deployerCache", getter)]
    pub fn deployer_cache(&self) -> JsValue {
        let serializer = Serializer::new().serialize_maps_as_objects(true);
        self.0
            .read()
            .unwrap()
            .deployer_cache()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// All the cached dotrain uri/meta hash pairs
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

    /// Adds new subgraph endpoints
    #[wasm_bindgen(skip_typescript, js_name = "addSubgraphs")]
    pub fn add_subgraphs(&mut self, subgraphs: JsValue) {
        self.0
            .write()
            .unwrap()
            .add_subgraphs(&from_js_value::<Vec<String>>(subgraphs).unwrap_throw());
    }

    /// Get the corresponding meta bytes of the given hash if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getMeta")]
    pub fn get_meta(&self, hash: &str) -> JsValue {
        match self.0.read().unwrap().get_meta(hash) {
            Some(v) => to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED),
            None => JsValue::UNDEFINED,
        }
    }

    /// Get the NPE2 deployer details of the given deployer bytecode hash if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDeployer")]
    pub fn get_deployer(&self, hash: &str) -> JsValue {
        to_js_value(&self.0.read().unwrap().get_deployer(hash)).unwrap_or(JsValue::UNDEFINED)
    }

    /// Get the corresponding dotrain hash of the given dotrain uri if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainHash")]
    pub fn get_dotrain_hash(&self, uri: &str) -> JsValue {
        to_js_value(&self.0.read().unwrap().get_dotrain_hash(uri)).unwrap_or(JsValue::UNDEFINED)
    }

    /// Get the corresponding uri of the given dotrain hash if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainUri")]
    pub fn get_dotrain_uri(&self, hash: &str) -> JsValue {
        to_js_value(&self.0.read().unwrap().get_dotrain_uri(hash)).unwrap_or(JsValue::UNDEFINED)
    }

    /// Get the corresponding meta bytes of the given dotrain uri if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainMeta")]
    pub fn get_dotrain_meta(&self, uri: &str) -> JsValue {
        match self.0.read().unwrap().get_dotrain_meta(uri) {
            Some(v) => to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED),
            None => JsValue::UNDEFINED,
        }
    }

    /// Searches for NPE2 deployer details in the subgraphs given the deployer hash
    #[wasm_bindgen(skip_typescript, js_name = "searchDeployer")]
    pub async fn search_deployer(&mut self, hash: &str) -> JsValue {
        let subgraphs = self.0.read().unwrap().subgraphs().clone();
        match search_deployer(hash, &subgraphs).await {
            Ok(deployer_query_response) => {
                let deployer = self
                    .0
                    .write()
                    .unwrap()
                    .set_deployer_from_query_response(deployer_query_response);
                to_js_value(&deployer).unwrap_or(JsValue::UNDEFINED)
            }
            Err(_e) => JsValue::UNDEFINED,
        }
    }

    /// If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer()
    #[wasm_bindgen(skip_typescript, js_name = "searchDeployerCheck")]
    pub async fn search_deployer_check(&mut self, hash: &str) -> JsValue {
        if let Some(v) = self.0.read().unwrap().get_deployer(hash) {
            to_js_value(v).unwrap_or(JsValue::UNDEFINED)
        } else {
            let subgraphs = self.0.read().unwrap().subgraphs().clone();
            match search_deployer(hash, &subgraphs).await {
                Ok(deployer_query_response) => {
                    let deployer = self
                        .0
                        .write()
                        .unwrap()
                        .set_deployer_from_query_response(deployer_query_response);
                    to_js_value(&deployer).unwrap_or(JsValue::UNDEFINED)
                }
                Err(_e) => JsValue::UNDEFINED,
            }
        }
    }

    /// Sets deployer record
    #[wasm_bindgen(skip_typescript, js_name = "setDeployer")]
    pub fn set_deployer(&mut self, deployer_response: JsValue) -> JsValue {
        let deployer: DeployerNPResponse = from_js_value(deployer_response).unwrap_throw();
        to_js_value(
            &self
                .0
                .write()
                .unwrap()
                .set_deployer_from_query_response(deployer),
        )
        .unwrap_throw()
    }

    /// Updates the meta cache by searching through all subgraphs for the given hash
    #[wasm_bindgen(skip_typescript)]
    pub async fn update(&mut self, hash: &str) -> JsValue {
        let subgraphs = self.0.read().unwrap().subgraphs().clone();
        match search(hash, &subgraphs).await {
            Ok(res) => {
                self.0.write().unwrap().update_with(hash, &res.bytes);
                to_js_value(&res.bytes).unwrap_or(JsValue::UNDEFINED)
            }
            Err(_e) => JsValue::UNDEFINED,
        }
    }

    /// First checks if the meta is stored and returns it if so, else will perform update()
    #[wasm_bindgen(skip_typescript, js_name = "updateCheck")]
    pub async fn update_check(&mut self, hash: &str) -> JsValue {
        if let Some(v) = self.0.read().unwrap().get_meta(hash) {
            to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED)
        } else {
            let subgraphs = self.0.read().unwrap().subgraphs().clone();
            match search(hash, &subgraphs).await {
                Ok(res) => {
                    self.0.write().unwrap().update_with(hash, &res.bytes);
                    to_js_value(&res.bytes).unwrap_or(JsValue::UNDEFINED)
                }
                Err(_e) => JsValue::UNDEFINED,
            }
        }
    }

    /// Updates the meta cache by the given hash and meta bytes, checks the hash to bytes
    /// validity
    #[wasm_bindgen(skip_typescript, js_name = "updateWith")]
    pub fn update_with(&mut self, hash: &str, bytes: &[u8]) {
        self.0.write().unwrap().update_with(hash, bytes);
    }

    /// Deletes a dotrain record given its uri
    #[wasm_bindgen(skip_typescript, js_name = "deleteDotrain")]
    pub fn delete_dotrain(&mut self, uri: &str, keep_meta: bool) {
        self.0.write().unwrap().delete_dotrain(uri, keep_meta);
    }

    /// Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
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

    /// Merges another instance of MetaStore to this instance lazily, avoids duplicates
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

/// seraches for a meta for a given hash in the given subgraphs
#[wasm_bindgen(js_name = "searchMeta")]
pub async fn js_search_meta(hash: &str, subgraphs: Vec<String>) -> Result<Uint8Array, JsValue> {
    match search(hash, &subgraphs).await {
        Ok(res) => Ok(res.bytes.as_slice().into()),
        Err(e) => Err(e.to_string().into()),
    }
}

/// seraches for a ExpressionDeployer reproducible data for a given hash in the given subgraphs
#[wasm_bindgen(js_name = "searchDeployer")]
pub async fn js_search_deployer(
    hash: &str,
    subgraphs: Vec<String>,
) -> Result<DeployerQueryResponse, JsValue> {
    match search_deployer(hash, &subgraphs).await {
        Ok(res) => Ok(DeployerQueryResponse {
            obj: to_js_value(&res).unwrap_throw(),
        }),
        Err(e) => Err(e.to_string().into()),
    }
}
