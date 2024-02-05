use rain_metadata::Store;
use std::{
    fs::read_to_string,
    sync::{Arc, RwLock},
};
use super::{rainconfig::RainConfigStruct, super::parser::raindocument::RainDocument, Compose};

/// Composes only the given .rain files based on provided options
pub async fn compose_target(opts: Compose) -> anyhow::Result<String> {
    let force = opts.force.unwrap_or(false);
    let local_data_only = opts.local_data_only.unwrap_or(false);
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
    let mut rain_document = RainDocument::new(text, Some(store.clone()), 0, None);

    // parse with overrides and exit in case overrides had errors
    rain_document.parse_with_rebinds(!local_data_only, opts.bind).await?;

    // generate rainlang
    let entrypoints = opts
        .entrypoint
        .iter()
        .map(|e| e.as_str())
        .collect::<Vec<&str>>();

    Ok(rain_document.compose(&entrypoints)?)
}
