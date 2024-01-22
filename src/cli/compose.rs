use rain_meta::Store;
use std::{
    fs::read_to_string,
    sync::{Arc, RwLock},
};
use super::{rainconfig::RainConfigStruct, super::parser::raindocument::RainDocument, RainComposerCli};

/// Composes only the given .rain files based on provided options
pub async fn compose_target(
    opts: RainComposerCli,
    local_data_only: bool,
    force: bool,
) -> anyhow::Result<()> {
    let store = if let Some(rainconfig_path) = &opts.config {
        let rainconfig = RainConfigStruct::read(rainconfig_path)?;
        if force {
            rainconfig.force_build_store()?
        } else {
            rainconfig.build_store()?
        }
    } else {
        Arc::new(RwLock::new(Store::default()))
    };

    // read the dotrain text
    let text = read_to_string(&opts.input)?;

    // instantiate the RainDocument
    let mut rain_document = RainDocument::new(text, Some(store.clone()), 0);

    // parse
    if local_data_only {
        rain_document.parse(false).await;
    } else {
        rain_document.parse(true).await;
    }

    // generate rainlang
    let entrypoints = opts
        .entrypoints
        .iter()
        .map(|e| e.as_str())
        .collect::<Vec<&str>>();
    let result = match rain_document.compose(&entrypoints) {
        Ok(v) => serde_json::to_string_pretty(&v)?,
        Err(e) => serde_json::to_string_pretty(&e)?,
    };

    // print on stdout
    println!("{}", result);

    Ok(())
}
