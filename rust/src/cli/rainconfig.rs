use rain_meta::Store;
use serde::{Serialize, Deserialize};
use alloy_primitives::{keccak256, hex::encode_prefixed};
use std::{
    path::PathBuf,
    sync::{Arc, RwLock},
    fs::{read, read_to_string, read_dir},
};

pub const DEFAULT_RAINCONFIG_PATH: &str = "rainconfig.json";
pub const RAINCONFIG_DESCRIPTION: &str = "Description:
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

  - meta: Lis of paths (or object of path and hash) of local meta files as binary or utf8 
  encoded text file containing hex string starting with 0x. Binary meta files should go 
  under 'meta.binary' field and hex meta files should go under 'meta.hex' field.";

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfigCompilationMap {
    pub input: PathBuf,
    pub output: PathBuf,
    pub entrypoints: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct MetaPathTypeFull {
    pub path: PathBuf,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(untagged)]
pub enum MetaPathType {
    Full(MetaPathTypeFull),
    PathOnly(PathBuf),
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfigMeta {
    pub binary: Option<Vec<MetaPathType>>,
    pub hex: Option<Vec<MetaPathType>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfig {
    pub src: Option<Vec<RainConfigCompilationMap>>,
    pub include: Option<Vec<PathBuf>>,
    pub subgraphs: Option<Vec<String>>,
    pub meta: Option<RainConfigMeta>,
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

    fn process(
        &self,
        force: bool,
    ) -> anyhow::Result<(Vec<(PathBuf, String)>, Vec<(String, Vec<u8>)>)> {
        let mut dotrains = vec![];
        let mut metas = vec![];
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
            if let Some(hex_metas) = &all_metas.hex {
                for hex_meta_path in hex_metas {
                    match hex_meta_path {
                        MetaPathType::PathOnly(p) => match read_to_string(p) {
                            Ok(hex_string) => match alloy_primitives::hex::decode(&hex_string) {
                                Ok(data) => {
                                    metas.push((encode_prefixed(keccak256(&data).0), data));
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
                            Ok(hex_string) => match alloy_primitives::hex::decode(&hex_string) {
                                Ok(data) => {
                                    let hash = f.hash.to_ascii_lowercase();
                                    if encode_prefixed(keccak256(&data).0) == hash {
                                        metas.push((hash, data));
                                    } else {
                                        if !force {
                                            return Err(anyhow::anyhow!(format!(
                                                "meta hash/content mismatch at {:?}",
                                                f.path
                                            )));
                                        }
                                    }
                                }
                                Err(e) => {
                                    if !force {
                                        return Err(anyhow::anyhow!(format!(
                                            "{:?} at {:?}",
                                            e, f.path
                                        )));
                                    }
                                }
                            },
                            Err(e) => {
                                if !force {
                                    Err(e)?
                                }
                            }
                        },
                    }
                }
            }
            if let Some(binary_metas) = &all_metas.binary {
                for binary_meta_path in binary_metas {
                    match binary_meta_path {
                        MetaPathType::PathOnly(p) => match read(p) {
                            Ok(data) => {
                                metas.push((encode_prefixed(keccak256(&data).0), data));
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
                                if encode_prefixed(keccak256(&data).0) == hash {
                                    metas.push((hash, data));
                                } else {
                                    if !force {
                                        return Err(anyhow::anyhow!(format!(
                                            "meta hash/content mismatch at {:?}",
                                            f.path
                                        )));
                                    }
                                }
                            }
                            Err(e) => {
                                if !force {
                                    Err(e)?
                                }
                            }
                        },
                    }
                }
            }
        }
        Ok((dotrains, metas))
    }

    pub fn build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let (dotrains, metas) = self.process(true)?;
        let mut store = Store::default();
        store.add_subgraphs(&subgraphs);
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
        Ok(Arc::new(RwLock::new(store)))
    }

    pub fn force_build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let (dotrains, metas) = self.process(false)?;
        let mut store = Store::default();
        store.add_subgraphs(&subgraphs);
        for (hash, bytes) in metas {
            store.update_with(&hash, &bytes);
        }
        for (path, text) in dotrains {
            if let Some(uri) = path.to_str() {
                let uri = uri.to_string();
                store.set_dotrain(&text, &uri, true)?;
            }
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
        } else {
            if dir.is_file() {
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
    }
    Ok(files_contents)
}
