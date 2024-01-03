use serde_bytes::ByteBuf;
use serde::{Serialize, Deserialize};
use alloy_primitives::{keccak256, hex};
use rain_meta::{Store, DeployerResponse, RainMetaDocumentV1Item};
use std::{
    path::PathBuf,
    sync::{Arc, RwLock},
    fs::{read, read_to_string, read_dir},
    collections::HashMap,
};

pub(crate) const DEFAULT_RAINCONFIG_PATH: &str = "rainconfig.json";
pub(crate) const RAINCONFIG_DESCRIPTION: &str = r"
Description:
rainconfig.json provides configuration details and information required for .rain compiler.

usually it should be placed at the root directory of the working workspace and named as 
'rainconfig.json' or '.rainconfig.json', as by doing so it will automatically be read 
and having rainlang vscode extension, it will provide autocomplete and information on 
each field, however if this is not desired at times, it is possible to pass any path for 
rainconfig when using the dotrain command using --config option.

all fields in the rainconfig are optional and are as follows:

  - src: Specifies list of .rain source files mappings for compilation, where specified 
  .rain input files will get compiled and results written into output json file.

  - include: Specifies a list of directories (files/folders) to be included and watched. 
  'src' files are included by default and folders will be watched recursively for .rain files. 
  These files will be available as dotrain meta in the cas so if their hash is specified in a
  compilation target they will get resolved.

  - subgraphs: Additional subgraph endpoint URLs to include when searching for metas of 
  specified meta hashes in a rainlang document.

  - meta: List of paths (or object of path and hash) of local meta files as binary or utf8 
  encoded text file containing hex string starting with 0x.

  - deployers: List of ExpressionDeployers data sets which represents all the data required for 
  reproducing it on a local evm, paired with their corresponding hash as a key/value pair, each 
  pair has the fields that hold a path to disk location to read data from, 'expressionDeployer', 
  'parser', 'store', 'interpreter' fields should point to contract json artifact where their 
  bytecode and deployed bytecode can be read from and 'constructionMeta' is specified the same 
  as any other meta.
";
pub(crate) const RAINCONFIG_SRC_DESCRIPTION: &str = r"Specifies list of .rain source files mappings for compilation, where specified .rain input files will get compiled and results written into output json file.";
pub(crate) const RAINCONFIG_INCLUDE_DESCRIPTION: &str = r"Specifies a list of directories (files/folders) to be included and watched. 'src' files are included by default and folders will be watched recursively for .rain files. These files will be available as dotrain meta in the cas so if their hash is specified in a compilation target they will get resolved.";
pub(crate) const RAINCONFIG_SUBGRAPHS_DESCRIPTION: &str = r"Additional subgraph endpoint URLs to include when searching for metas of specified meta hashes in a rainlang document.";
pub(crate) const RAINCONFIG_META_DESCRIPTION: &str = r"List of paths (or object of path and hash) of local meta files as binary or utf8 encoded text file containing hex string starting with 0x.";
pub(crate) const RAINCONFIG_DEPLOYERS_DESCRIPTION: &str = r"List of ExpressionDeployers data sets which represents all the data required for reproducing it on a local evm, paired with their corresponding hash as a key/value pair, each pair has the fields that hold a path to disk location to read data from, 'expressionDeployer', 'parser', 'store', 'interpreter' fields should point to contract json artifact where their bytecode and deployed bytecode can be read from and 'constructionMeta' is specified the same as any other meta.";

/// A compilation map for single .rain file
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfigCompilationMap {
    /// Path of the .rain file
    pub input: PathBuf,
    /// Path where compilation result should written into
    pub output: PathBuf,
    /// The entrypoints for compilation
    pub entrypoints: Vec<String>,
}

/// A Rain meta path with hash
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct MetaPathTypeFull {
    pub path: PathBuf,
    pub hash: String,
}

/// Type of a meta path
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(untagged)]
pub enum MetaPathType {
    /// Indicates a full path with hash
    Full(MetaPathTypeFull),
    /// Indicates the path only
    PathOnly(PathBuf),
}

/// Type of a meta data type
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RainConfigMetaType {
    /// Indicates a binary data
    Binary(MetaPathType),
    /// Indicates a utf8 encoded hex string data
    Hex(MetaPathType),
}

/// Data structure of deserialized deployer item from rainconfig.json
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RainConfigDeployer {
    pub construction_meta: RainConfigMetaType,
    pub expression_deployer: PathBuf,
    pub parser: PathBuf,
    pub store: PathBuf,
    pub interpreter: PathBuf,
}

/// Data structure of deserialized rainconfig.json
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfig {
    pub src: Option<Vec<RainConfigCompilationMap>>,
    pub include: Option<Vec<PathBuf>>,
    pub subgraphs: Option<Vec<String>>,
    pub meta: Option<Vec<RainConfigMetaType>>,
    pub deployers: Option<HashMap<String, RainConfigDeployer>>,
}

impl RainConfig {
    /// reads rainconfig from the given path
    pub fn read(path: &PathBuf) -> anyhow::Result<RainConfig> {
        let content = read(path)?;
        let rainconfig: RainConfig = serde_json::from_slice(&content)?;
        Ok(rainconfig)
    }

    /// reads rainconfig from the given path
    pub fn read_default() -> anyhow::Result<RainConfig> {
        let content = read(DEFAULT_RAINCONFIG_PATH)?;
        let rainconfig: RainConfig = serde_json::from_slice(&content)?;
        Ok(rainconfig)
    }

    pub fn read_included_files(&self, force: bool) -> anyhow::Result<Vec<(PathBuf, String)>> {
        let mut files_contents = vec![];
        if let Some(included_dirs) = &self.include {
            for included_dir in included_dirs {
                match read_dotrain_files(included_dir, force) {
                    Ok(v) => files_contents.extend(v),
                    Err(e) => {
                        if !force {
                            Err(e)?
                        }
                    }
                }
            }
        }
        Ok(files_contents)
    }

    fn process(&self, force: bool) -> anyhow::Result<ProcessType> {
        let mut dotrains = vec![];
        let mut metas = vec![];
        let mut np_deployers = vec![];
        if let Some(src) = &self.src {
            for cmap in src {
                match read_to_string(&cmap.input) {
                    Ok(v) => dotrains.push((cmap.input.clone(), v)),
                    Err(e) => {
                        if !force {
                            Err(e)?
                        }
                    }
                }
            }
        }
        match self.read_included_files(force) {
            Ok(v) => dotrains.extend(v),
            Err(e) => {
                if !force {
                    Err(e)?
                }
            }
        }
        if let Some(all_metas) = &self.meta {
            for m in all_metas {
                read_meta(m, &mut metas, force)?;
            }
        }
        if let Some(deployers) = &self.deployers {
            for (hash, deployer) in deployers {
                match read_deployer(hash, deployer) {
                    Ok(v) => {
                        np_deployers.push(v);
                    }
                    Err(e) => {
                        if !force {
                            Err(e)?
                        }
                    }
                }
            }
        }
        Ok(ProcessType(dotrains, metas, np_deployers))
    }

    /// Build a Store instance from all specified configuraion in rainconfig
    pub fn build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let ProcessType(dotrains, metas, mut deployers) = self.process(true)?;
        let mut store = Store::default();
        store.add_subgraphs(subgraphs);
        for (hash, bytes) in metas {
            store.update_with(&hash, &bytes);
        }
        for (path, text) in dotrains {
            if let Some(uri) = path.to_str() {
                let uri = uri.to_string();
                store.set_dotrain(&text, &uri, true)?;
            } else {
                return Err(anyhow::anyhow!(format!(
                    "could not derive a valid utf-8 encoded URI from path: {:?}",
                    path
                )));
            }
        }
        while let Some(deployer) = deployers.pop() {
            store.set_deployer_from_query_response(deployer);
        }
        Ok(Arc::new(RwLock::new(store)))
    }

    /// Builds a Store instance from all specified configuraion in rainconfig by ignoring all erroneous path/items
    pub fn force_build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let ProcessType(dotrains, metas, mut deployers) = self.process(false)?;
        let mut store = Store::default();
        store.add_subgraphs(subgraphs);
        for (hash, bytes) in metas {
            store.update_with(&hash, &bytes);
        }
        for (path, text) in dotrains {
            if let Some(uri) = path.to_str() {
                let uri = uri.to_string();
                store.set_dotrain(&text, &uri, true)?;
            }
        }
        while let Some(deployer) = deployers.pop() {
            store.set_deployer_from_query_response(deployer);
        }
        Ok(Arc::new(RwLock::new(store)))
    }
}

/// reads rain files recursively from the provided path
fn read_dotrain_files(path: &PathBuf, force: bool) -> anyhow::Result<Vec<(PathBuf, String)>> {
    let mut files_contents = vec![];
    for read_dir_result in read_dir(path)? {
        let dir = read_dir_result?.path();
        if dir.is_dir() {
            match read_dotrain_files(&dir, force) {
                Ok(v) => files_contents.extend(v),
                Err(e) => {
                    if !force {
                        Err(e)?
                    }
                }
            }
        } else if dir.is_file() {
            if let Some(ext) = dir.extension() {
                if ext == "rain" {
                    match read_to_string(&dir) {
                        Ok(v) => files_contents.push((dir.clone(), v)),
                        Err(e) => {
                            if !force {
                                Err(e)?
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(files_contents)
}

fn read_meta(
    meta: &RainConfigMetaType,
    metas: &mut Vec<(String, Vec<u8>)>,
    force: bool,
) -> anyhow::Result<()> {
    match meta {
        RainConfigMetaType::Binary(binary_meta_path) => match binary_meta_path {
            MetaPathType::PathOnly(p) => match read(p) {
                Ok(data) => {
                    metas.push((hex::encode_prefixed(keccak256(&data).0), data));
                }
                Err(e) => {
                    if !force {
                        Err(e)?
                    }
                }
            },
            MetaPathType::Full(f) => match read(&f.path) {
                Ok(data) => {
                    let hash = f.hash.to_ascii_lowercase();
                    if hex::encode_prefixed(keccak256(&data).0) == hash {
                        metas.push((hash, data));
                    } else if !force {
                        return Err(anyhow::anyhow!(format!(
                            "meta hash/content mismatch at {:?}",
                            f.path
                        )));
                    }
                }
                Err(e) => {
                    if !force {
                        Err(e)?
                    }
                }
            },
        },
        RainConfigMetaType::Hex(hex_meta_path) => match hex_meta_path {
            MetaPathType::PathOnly(p) => match read_to_string(p) {
                Ok(hex_string) => match hex::decode(hex_string) {
                    Ok(data) => {
                        metas.push((hex::encode_prefixed(keccak256(&data).0), data));
                    }
                    Err(e) => {
                        if !force {
                            return Err(anyhow::anyhow!(format!("{:?} at {:?}", e, p)));
                        }
                    }
                },
                Err(e) => {
                    if !force {
                        Err(e)?
                    }
                }
            },
            MetaPathType::Full(f) => match read_to_string(&f.path) {
                Ok(hex_string) => match hex::decode(hex_string) {
                    Ok(data) => {
                        let hash = f.hash.to_ascii_lowercase();
                        if hex::encode_prefixed(keccak256(&data).0) == hash {
                            metas.push((hash, data));
                        } else if !force {
                            return Err(anyhow::anyhow!(format!(
                                "meta hash/content mismatch at {:?}",
                                f.path
                            )));
                        }
                    }
                    Err(e) => {
                        if !force {
                            return Err(anyhow::anyhow!(format!("{:?} at {:?}", e, f.path)));
                        }
                    }
                },
                Err(e) => {
                    if !force {
                        Err(e)?
                    }
                }
            },
        },
    }
    Ok(())
}

fn read_deployer(hash: &str, deployer: &RainConfigDeployer) -> anyhow::Result<DeployerResponse> {
    let mut metas = vec![];
    read_meta(&deployer.construction_meta, &mut metas, false)?;
    let (meta_hash, meta_bytes) = if metas.len() == 1 {
        metas.pop().unwrap()
    } else {
        return Err(anyhow::anyhow!("could not reaed construction meta!"));
    };
    let exp_deployer = read_bytecode(&deployer.expression_deployer)?;
    let bytecode = if let Some(v) = exp_deployer.0 {
        v
    } else {
        return Err(anyhow::anyhow!(
            "could not find ExpressionDeployer bytecode!"
        ));
    };
    let bytecode_meta_hash = if let Some(v) = exp_deployer.1 {
        hex::encode_prefixed(
            RainMetaDocumentV1Item {
                payload: ByteBuf::from(v),
                magic: rain_meta::KnownMagic::ExpressionDeployerV2BytecodeV1,
                content_type: rain_meta::ContentType::OctetStream,
                content_encoding: rain_meta::ContentEncoding::None,
                content_language: rain_meta::ContentLanguage::None,
            }
            .hash(false)?,
        )
        .to_ascii_lowercase()
    } else {
        return Err(anyhow::anyhow!(
            "could not find ExpressionDeployer deployed bytecode!"
        ));
    };
    Ok(DeployerResponse {
        meta_hash,
        meta_bytes,
        bytecode,
        parser: read_bytecode(&deployer.parser)?
            .0
            .ok_or(anyhow::anyhow!(format!(
                "could not read parser deployed bytecode at {:?}",
                deployer.parser
            )))?,
        store: read_bytecode(&deployer.store)?
            .0
            .ok_or(anyhow::anyhow!(format!(
                "could not read store deployed bytecode at {:?}",
                deployer.store
            )))?,
        interpreter: read_bytecode(&deployer.interpreter)?
            .0
            .ok_or(anyhow::anyhow!(format!(
                "could not read interpreter deployed bytecode at {:?}",
                deployer.interpreter
            )))?,
        bytecode_meta_hash,
        tx_hash: hash.to_ascii_lowercase(),
    })
}

fn read_bytecode(path: &PathBuf) -> anyhow::Result<ArtifactBytecode> {
    let content = read(path)?;
    let json = serde_json::from_slice::<serde_json::Value>(&content)?;
    let deployed_bytecode = &json["deployedBytecode"]["object"];
    let bytecode = &json["bytecode"]["object"];
    if bytecode.is_string() && deployed_bytecode.is_string() {
        let mut err = Err(anyhow::anyhow!(""));
        let b = match hex::decode(bytecode.as_str().unwrap()) {
            Ok(data) => Some(data),
            Err(e) => {
                err = Err(anyhow::anyhow!(format!("{:?} at {:?}", e, path)));
                None
            }
        };
        let db = match hex::decode(deployed_bytecode.as_str().unwrap()) {
            Ok(data) => Some(data),
            Err(e) => {
                err = Err(anyhow::anyhow!(format!("{:?} at {:?}", e, path)));
                None
            }
        };
        if b.is_none() || db.is_none() {
            err
        } else {
            Ok(ArtifactBytecode(b, db))
        }
    } else if !bytecode.is_string() && deployed_bytecode.is_string() {
        match hex::decode(deployed_bytecode.as_str().unwrap()) {
            Ok(data) => Ok(ArtifactBytecode(None, Some(data))),
            Err(e) => Err(anyhow::anyhow!(format!("{:?} at {:?}", e, path))),
        }
    } else if bytecode.is_string() && !deployed_bytecode.is_string() {
        match hex::decode(bytecode.as_str().unwrap()) {
            Ok(data) => Ok(ArtifactBytecode(Some(data), None)),
            Err(e) => Err(anyhow::anyhow!(format!("{:?} at {:?}", e, path))),
        }
    } else {
        Err(anyhow::anyhow!(format!(
            "artifact at {:?} doesn't contain bytecode/deployed bytecode",
            path
        )))
    }
}

struct ProcessType(
    Vec<(PathBuf, String)>,
    Vec<(String, Vec<u8>)>,
    Vec<DeployerResponse>,
);

struct ArtifactBytecode(Option<Vec<u8>>, Option<Vec<u8>>);
