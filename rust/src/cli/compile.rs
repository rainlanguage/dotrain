use lsp_types::Url;
use rain_meta::Store;
use super::{Target, rainconfig::RainConfig, super::parser::raindocument::RainDocument};
use std::{
    path::PathBuf,
    sync::{Arc, RwLock},
    collections::VecDeque,
    fs::{read_to_string, write},
};

pub async fn rainconfig_compile(
    path: Option<PathBuf>,
    local_meta_only: bool,
) -> anyhow::Result<()> {
    let rainconfig = if let Some(p) = path {
        RainConfig::read(&p)?
    } else {
        RainConfig::read_default()?
    };
    let store = rainconfig.build_store()?;
    let mut compilation_results = VecDeque::new();
    if let Some(src) = &rainconfig.src {
        for cmap in src {
            let text = read_to_string(&cmap.input)?;
            let mut rd = RainDocument::_new(
                text,
                Url::parse("file:///untitled.rain").unwrap(),
                0,
                Some(store.clone()),
                0,
            );
            if local_meta_only {
                rd.parse();
            } else {
                rd.parse_async().await;
            }
            match rd.compile(&cmap.entrypoints, None, None) {
                Ok(v) => compilation_results.push_back(serde_json::to_string_pretty(&v)?),
                Err(e) => compilation_results.push_back(serde_json::to_string_pretty(&e)?),
            }
        }
        for cmap in src {
            if let Some(s) = compilation_results.pop_front() {
                write(&cmap.output, s.as_bytes())?;
            } else {
            }
        }
    }
    Ok(())
}

pub async fn target_compile(
    opts: Target,
    conf_path: Option<PathBuf>,
    local_meta_only: bool,
) -> anyhow::Result<()> {
    let store = if let Some(ignore_rainconfig) = opts.ignore_rainconfig {
        if ignore_rainconfig {
            let rainconfig = if let Some(p) = conf_path {
                RainConfig::read(&p)?
            } else {
                RainConfig::read_default()?
            };
            rainconfig.build_store()?
        } else {
            Arc::new(RwLock::new(Store::default()))
        }
    } else {
        Arc::new(RwLock::new(Store::default()))
    };

    let text = read_to_string(&opts.input)?;
    let mut rd = RainDocument::_new(
        text,
        Url::parse("file:///untitled.rain").unwrap(),
        0,
        Some(store.clone()),
        0,
    );
    if local_meta_only {
        rd.parse();
    } else {
        rd.parse_async().await;
    }
    let result = match rd.compile(&opts.entrypoints, None, None) {
        Ok(v) => serde_json::to_string_pretty(&v)?,
        Err(e) => serde_json::to_string_pretty(&e)?,
    };
    if let Some(stdout) = opts.stdout {
        if stdout {
            println!("{}", result);
        }
    }
    write(&opts.output, result.as_bytes())?;

    Ok(())
}
