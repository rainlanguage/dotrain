use rain_metadata::Store;
use serde::{Serialize, Deserialize};
use std::{
    path::PathBuf,
    sync::{Arc, RwLock},
    fs::{read, read_to_string, read_dir},
};

pub(crate) const RAINCONFIG_DESCRIPTION: &str = r"
Description:
rainconfig.json provides configuration details and information required for .rain composer.

usually it should be placed at the root directory of the working workspace and named as 
'rainconfig.json', however if this is not desired at times, it is possible to pass any path for 
rainconfig when using the dotrain command using --config option.

all fields in the rainconfig are optional and are as follows:

  - include: Specifies a list of directories (files/folders) to be included and watched. 
  folders will be watched recursively for .rain files. These files will be available as 
  dotrain meta in the cas so if their hash is specified in a compilation target they will 
  get resolved.

  - subgraphs: Additional subgraph endpoint URLs to include when searching for metas of 
  specified meta hashes in a rainlang document.
";
pub(crate) const RAINCONFIG_INCLUDE_DESCRIPTION: &str = r"Specifies a list of directories (files/folders) to be included and watched. folders will be watched recursively for .rain files. These files will be available as dotrain meta in the cas so if their hash is specified in a compilation target they will get resolved.";
pub(crate) const RAINCONFIG_SUBGRAPHS_DESCRIPTION: &str = r"Additional subgraph endpoint URLs to include when searching for metas of specified meta hashes in a rainlang document.";

/// Data structure of deserialized rainconfig.json
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RainConfigStruct {
    pub include: Option<Vec<PathBuf>>,
    pub subgraphs: Option<Vec<String>>,
}

impl RainConfigStruct {
    /// reads rainconfig from the given path
    pub fn read(path: &PathBuf) -> anyhow::Result<RainConfigStruct> {
        let content = read(path)?;
        let rainconfig: RainConfigStruct = serde_json::from_slice(&content)?;
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

    fn process(&self, force: bool) -> anyhow::Result<Vec<(PathBuf, String)>> {
        let mut dotrains = vec![];
        match self.read_included_files(force) {
            Ok(v) => dotrains.extend(v),
            Err(e) => {
                if !force {
                    Err(e)?
                }
            }
        }
        Ok(dotrains)
    }

    /// Build a Store instance from all specified configuraion in rainconfig
    pub fn build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let dotrains = self.process(true)?;
        let mut store = Store::default();
        store.add_subgraphs(subgraphs);
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

    /// Builds a Store instance from all specified configuraion in rainconfig by ignoring all erroneous path/items
    pub fn force_build_store(&self) -> anyhow::Result<Arc<RwLock<Store>>> {
        let temp: Vec<String> = vec![];
        let subgraphs = if let Some(sgs) = &self.subgraphs {
            sgs
        } else {
            &temp
        };
        let dotrains = self.process(false)?;
        let mut store = Store::default();
        store.add_subgraphs(subgraphs);
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
