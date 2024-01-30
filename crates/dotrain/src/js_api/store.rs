use tsify::Tsify;
use js_sys::Uint8Array;
use alloy_primitives::hex;
use wasm_bindgen::prelude::*;
use rain_metadata::{Store, search};
use serde::{Serialize, Deserialize};
use std::{
    sync::{Arc, RwLock},
    collections::HashMap,
};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value, Serializer};

// a wrapper struct for &[u8] to be serialized as Uint8Array from rust -> wasm -> js
#[derive(Hash, Eq, PartialEq)]
struct ToUint8ArraySerializer<'a>(&'a [u8]);
impl<'a> Serialize for ToUint8ArraySerializer<'a> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_bytes(self.0)
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
* Hashes are stored as bytes of the underlying value and meta bytes are valid cbor 
* encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to 
* deployedBytecode meta hash and deploy transaction hash.
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
  readonly cache: Map<Uint8Array, Uint8Array>;
  /**
   * All the cached dotrain uri/meta hash pairs
   */
  readonly dotrainCache: Map<string, Uint8Array>;

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
   * @param {Uint8Array} hash
   * @returns {Uint8Array | undefined}
   */
  getMeta(hash: Uint8Array): Uint8Array | undefined;
  /**
   * Get the corresponding dotrain hash of the given dotrain uri if it is cached
   * @param {string} uri
   * @returns {Uint8Array | undefined}
   */
  getDotrainHash(uri: string): Uint8Array | undefined;
  /**
   * Get the corresponding uri of the given dotrain hash if it is cached
   * @param {Uint8Array} hash
   * @returns {string | undefined}
   */
  getDotrainUri(hash: Uint8Array): string | undefined;
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
   * Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
   * and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in
   * the scope of MetaStore and handling and passing on a correct URI for the given text must be handled
   * externally by the implementer
   * @param {string} text
   * @param {string} uri
   * @param {boolean} keep_old - keeps the old dotrain meta in the cache
   * @returns {Uint8Array[]} new hash and old hash if the given uri was already cached
   */
  setDotrain(text: string, uri: string, keep_old: boolean): Uint8Array[];
  /**
   * Updates the meta cache by the given hash and meta bytes, checks the hash to bytes validity
   * @param {Uint8Array} hash
   * @param {Uint8Array} bytes
   */
  updateWith(hash: Uint8Array, bytes: Uint8Array): void;
  /**
   * Updates the meta cache by searching through all subgraphs for the given hash
   * @param {Uint8Array} hash
   * @returns {Promise<Uint8Array | undefined>}
   */
  update(hash: Uint8Array): Promise<Uint8Array | undefined>;
  /**
   * First checks if the meta is stored and returns it if so, else will perform update()
   * @param {Uint8Array} hash
   * @returns {Promise<Uint8Array | undefined>}
   */
  updateCheck(hash: Uint8Array): Promise<Uint8Array | undefined>;
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
    #[tsify(optional, type = "Map<Uint8Array, Uint8Array>")]
    pub cache: HashMap<Vec<u8>, Vec<u8>>,
    #[serde(default)]
    #[tsify(optional, type = "Map<string, Uint8Array>")]
    pub dotrain_cache: HashMap<String, Vec<u8>>,
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
 
 Hashes are stored as bytes of the underlying value and meta bytes are valid cbor 
 encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to 
 deployedBytecode meta hash and deploy transaction hash.
 
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
#[repr(transparent)]
pub struct MetaStore(pub(crate) Arc<RwLock<Store>>);

#[wasm_bindgen]
impl MetaStore {
    /// Constructs a new instance
    #[wasm_bindgen(skip_typescript, constructor)]
    pub fn new(include_rain_subgraphs: Option<bool>) -> MetaStore {
        if include_rain_subgraphs.unwrap_or(true) {
            MetaStore(Arc::new(RwLock::new(Store::default())))
        } else {
            MetaStore(Arc::new(RwLock::new(Store::new())))
        }
    }

    /// Creates new instance of Store with given initial values
    /// it checks the validity of each item of the provided values and only stores those that are valid
    #[wasm_bindgen(skip_typescript)]
    pub fn create(options: MetaStoreOptions) -> MetaStore {
        MetaStore(Arc::new(RwLock::new(Store::create(
            &options.subgraphs,
            &options.cache,
            &HashMap::new(),
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
        let serializer = Serializer::new();
        self.0
            .read()
            .unwrap()
            .cache()
            .iter()
            .map(|(key, value)| (ToUint8ArraySerializer(key), ToUint8ArraySerializer(value)))
            .collect::<HashMap<ToUint8ArraySerializer, ToUint8ArraySerializer>>()
            .serialize(&serializer)
            .unwrap_throw()
    }

    /// All the cached dotrain uri/meta hash pairs
    #[wasm_bindgen(skip_typescript, js_name = "dotrainCache", getter)]
    pub fn dotrain_cache(&self) -> JsValue {
        let serializer = Serializer::new();
        self.0
            .read()
            .unwrap()
            .dotrain_cache()
            .iter()
            .map(|(key, value)| (key, ToUint8ArraySerializer(value)))
            .collect::<HashMap<&String, ToUint8ArraySerializer>>()
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
    pub fn get_meta(&self, hash: &[u8]) -> JsValue {
        self.0
            .read()
            .unwrap()
            .get_meta(hash)
            .map_or(JsValue::UNDEFINED, |v| {
                to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED)
            })
    }

    /// Get the corresponding dotrain hash of the given dotrain uri if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainHash")]
    pub fn get_dotrain_hash(&self, uri: &str) -> JsValue {
        // to_js_value(&ToUint8ArraySerializer(&self.0.read().unwrap().get_dotrain_hash(uri))).unwrap_or(JsValue::UNDEFINED)
        to_js_value(
            &self
                .0
                .read()
                .unwrap()
                .get_dotrain_hash(uri)
                .map(|v| ToUint8ArraySerializer(v)),
        )
        .unwrap_or(JsValue::UNDEFINED)
    }

    /// Get the corresponding uri of the given dotrain hash if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainUri")]
    pub fn get_dotrain_uri(&self, hash: &[u8]) -> JsValue {
        to_js_value(&self.0.read().unwrap().get_dotrain_uri(hash)).unwrap_or(JsValue::UNDEFINED)
    }

    /// Get the corresponding meta bytes of the given dotrain uri if it is cached
    #[wasm_bindgen(skip_typescript, js_name = "getDotrainMeta")]
    pub fn get_dotrain_meta(&self, uri: &str) -> JsValue {
        self.0
            .read()
            .unwrap()
            .get_dotrain_meta(uri)
            .map_or(JsValue::UNDEFINED, |v| {
                to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED)
            })
    }

    /// Updates the meta cache by searching through all subgraphs for the given hash
    #[wasm_bindgen(skip_typescript)]
    pub async fn update(&mut self, hash: &[u8]) -> JsValue {
        let subgraphs = self.0.read().unwrap().subgraphs().clone();
        match search(&hex::encode_prefixed(hash), &subgraphs).await {
            Ok(res) => {
                self.0.write().unwrap().update_with(hash, &res.bytes);
                to_js_value(&ToUint8ArraySerializer(&res.bytes)).unwrap_or(JsValue::UNDEFINED)
            }
            Err(_e) => JsValue::UNDEFINED,
        }
    }

    /// First checks if the meta is stored and returns it if so, else will perform update()
    #[wasm_bindgen(skip_typescript, js_name = "updateCheck")]
    #[allow(clippy::await_holding_lock)]
    pub async fn update_check(&mut self, hash: &[u8]) -> JsValue {
        if let Some(v) = self.0.read().unwrap().get_meta(hash) {
            to_js_value(&ToUint8ArraySerializer(v)).unwrap_or(JsValue::UNDEFINED)
        } else {
            let subgraphs = self.0.read().unwrap().subgraphs().clone();
            match search(&hex::encode_prefixed(hash), &subgraphs).await {
                Ok(res) => {
                    self.0.write().unwrap().update_with(hash, &res.bytes);
                    to_js_value(&ToUint8ArraySerializer(&res.bytes)).unwrap_or(JsValue::UNDEFINED)
                }
                Err(_e) => JsValue::UNDEFINED,
            }
        }
    }

    /// Updates the meta cache by the given hash and meta bytes, checks the hash to bytes
    /// validity
    #[wasm_bindgen(skip_typescript, js_name = "updateWith")]
    pub fn update_with(&mut self, hash: &[u8], bytes: &[u8]) {
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
            Ok(v) => {
                if v.1.is_empty() {
                    Ok(to_js_value(&[ToUint8ArraySerializer(&v.0)]).unwrap_throw())
                } else {
                    Ok(
                        to_js_value(&[ToUint8ArraySerializer(&v.0), ToUint8ArraySerializer(&v.1)])
                            .unwrap_throw(),
                    )
                }
            }
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

impl From<Arc<RwLock<Store>>> for MetaStore {
    fn from(value: Arc<RwLock<Store>>) -> Self {
        Self(value)
    }
}

impl From<&MetaStore> for Arc<RwLock<Store>> {
    fn from(value: &MetaStore) -> Self {
        value.0.clone()
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
