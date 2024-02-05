//! A [mod@clap] based module to produce a CLI app
//!
//! Gets enabled by `cli` feature
//! struct, enums that use `clap` derive macro to produce CLI commands, argument
//! and options while underlying functions handle each scenario

use std::error::Error;
use std::path::PathBuf;
use crate::parser::Rebind;
use clap::{Parser, Subcommand, command};

mod compose;
mod rainconfig;

pub use compose::*;
pub use rainconfig::*;

/// CLI app entrypoint sruct
#[derive(Parser)]
#[command(author, version, about = "Dotrain cli", long_about = None)]
struct Cli {
    #[command(subcommand)]
    dotrain: Dotrain,
}

#[derive(Subcommand)]
pub enum Dotrain {
    /// Compose a .rain file to rainlang
    Compose(Compose),
    /// Prints 'rainconfig' info and description
    #[command(subcommand)]
    Rainconfig(RainconfigInfo),
}

/// Subcommand entry point
#[derive(Parser, Debug)]
pub struct Compose {
    /// Input .rain file path
    #[arg(short, long)]
    input: PathBuf,
    /// Entrypoints
    #[arg(short, long)]
    entrypoint: Vec<String>,
    /// rebinds items with new literal values
    #[arg(short, long, value_parser = parse_key_val)]
    bind: Option<Vec<Rebind>>,
    /// Path to the rainconfig json file that contains configurations,
    /// if provided will be used to when composing the .rain, see
    /// './example.rainconfig.json' for more details.
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Force compile by ignoring all erroneous paths/contents specified in rainconfig
    #[arg(short, long)]
    force: Option<bool>,
    /// Only use local dotrain meta specified in rainconfig include field and dont search for them in subgraphs
    #[arg(short, long)]
    local_data_only: Option<bool>,
}

/// rainconfig available commands
#[derive(Subcommand, Debug)]
pub enum RainconfigInfo {
    /// Prints general info about rainconfig
    Info,
    /// Prints all known rainconfig field names
    PrintAll,
    /// Prints info about 'include' field
    Include,
    /// Prints info about 'subgraphs' field
    Subgraphs,
}

/// Parse a single key-value pair
fn parse_key_val(key_value_pair: &str) -> Result<Rebind, Box<dyn Error + Send + Sync + 'static>> {
    let pos = key_value_pair
        .find('=')
        .ok_or_else(|| format!("invalid key=value: no `=` found in `{key_value_pair}`"))?;
    Ok(Rebind(
        key_value_pair[..pos].to_owned(),
        key_value_pair[pos + 1..].to_owned(),
    ))
}

/// Dispatches the CLI call based on the given options and commands
pub async fn dispatch(dotrain: Dotrain) -> anyhow::Result<()> {
    match dotrain {
        Dotrain::Compose(cli) => {
            println!("{}", compose_target(cli).await?);
        }
        Dotrain::Rainconfig(v) => match v {
            RainconfigInfo::Info => println!("{}", rainconfig::RAINCONFIG_DESCRIPTION),
            RainconfigInfo::PrintAll => {
                println!("{}", ["- include", "- subgraphs"].join("\n"))
            }
            RainconfigInfo::Include => {
                println!("{}", rainconfig::RAINCONFIG_INCLUDE_DESCRIPTION)
            }
            RainconfigInfo::Subgraphs => {
                println!("{}", rainconfig::RAINCONFIG_SUBGRAPHS_DESCRIPTION)
            }
        },
    };
    Ok(())
}

pub async fn main() -> anyhow::Result<()> {
    tracing::subscriber::set_global_default(tracing_subscriber::fmt::Subscriber::new())?;
    let cli = Cli::parse();
    dispatch(cli.dotrain).await
}
