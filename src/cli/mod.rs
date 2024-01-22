//! A [mod@clap] based module to produce a CLI app
//!
//! Gets enabled by `cli` feature
//! struct, enums that use `clap` derive macro to produce CLI commands, argument
//! and options while underlying functions handle each scenario

use std::path::PathBuf;
use clap::{Parser, Subcommand, command};

mod compose;
mod rainconfig;

pub use compose::*;
pub use rainconfig::*;

/// CLI app entrypoint sruct
#[derive(Parser, Debug)]
#[command(author, version, about = "Rain composer CLI binary to compose .rain files to rainlang", long_about = None)]
pub struct RainComposerCli {
    /// Input .rain file path
    #[arg(short, long)]
    input: PathBuf,
    /// Entrypoints
    #[arg(short, long)]
    entrypoints: Vec<String>,
    /// Path to the rainconfig json file that contains configurations,
    /// if provided will be used to when composing the .rain, see
    /// './example.rainconfig.json' for more details.
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Force compile by ignoring all erroneous paths/contents specified in rainconfig
    #[arg(short, long)]
    force: Option<bool>,
    /// Only use local meta and deployers specified in rainconfig and dont search for them in subgraphs
    #[arg(short, long)]
    local_data_only: Option<bool>,
    #[command(subcommand)]
    subcmd: Option<SubCommands>,
}

/// Top level commands
#[derive(Subcommand, Debug)]
pub enum SubCommands {
    /// Prints 'rainconfig' info and description
    #[command(subcommand)]
    RainconfigInfo(RainconfigInfo),
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
    /// Prints info about 'meta' field
    Meta,
    /// Prints info about 'deployers' field
    Deployers,
}

/// Dispatches the CLI call based on the given options and commands
pub async fn dispatch(cli: RainComposerCli) -> anyhow::Result<()> {
    let local_data_only = if let Some(v) = cli.local_data_only {
        v
    } else {
        false
    };
    let force = if let Some(v) = cli.force { v } else { false };
    if let Some(subcmd) = cli.subcmd {
        match subcmd {
            SubCommands::RainconfigInfo(v) => match v {
                RainconfigInfo::Info => println!("{}", rainconfig::RAINCONFIG_DESCRIPTION),
                RainconfigInfo::PrintAll => println!(
                    "{}",
                    ["- include", "- subgraphs", "- meta", "- deployers"].join("\n")
                ),
                RainconfigInfo::Include => {
                    println!("{}", rainconfig::RAINCONFIG_INCLUDE_DESCRIPTION)
                }
                RainconfigInfo::Subgraphs => {
                    println!("{}", rainconfig::RAINCONFIG_SUBGRAPHS_DESCRIPTION)
                }
                RainconfigInfo::Meta => println!("{}", rainconfig::RAINCONFIG_META_DESCRIPTION),
                RainconfigInfo::Deployers => {
                    println!("{}", rainconfig::RAINCONFIG_DEPLOYERS_DESCRIPTION)
                }
            },
        }
    } else {
        println!("{}", compose_target(cli, local_data_only, force).await?);
    };
    Ok(())
}

pub async fn main() -> anyhow::Result<()> {
    tracing::subscriber::set_global_default(tracing_subscriber::fmt::Subscriber::new())?;
    let cli = RainComposerCli::parse();
    dispatch(cli).await
}
