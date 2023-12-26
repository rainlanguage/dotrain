//! A [mod@clap] based CLI app
//!
//! struct, enums that use `clap` derive macro to produce CLI commands, argument
//! and options with underlying functions to handle each scenario

use std::path::PathBuf;
use clap::{Parser, Subcommand, command};

mod compile;
mod rainconfig;

pub use compile::*;
pub use rainconfig::*;

/// CLI app entrypoint sruct
#[derive(Parser, Debug)]
#[command(author, version, about = "Rain compiler CLI to compiler .rain files", long_about = None)]
pub struct RainCompilerCli {
    /// Path to the rainconfig json file that contains configurations, see
    /// './example.rainconfig.json' for more details.
    /// default is './rainconfig.json' if not specified
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
    /// Command for targeting a single .rain file to compile with options
    Target(Target),
    /// Prints 'rainconfig' info and description
    #[command(subcommand)]
    Rainconfig(Rainconfig),
}

/// Compile a target .rain entrypoint struct
#[derive(Parser, Debug)]
pub struct Target {
    /// Input .rain file path
    #[arg(short, long)]
    input: PathBuf,
    /// Output .json file path
    #[arg(short, long)]
    output: PathBuf,
    /// Entrypoints
    #[arg(short, long)]
    entrypoints: Vec<String>,
    /// Log the results to console
    #[arg(short, long)]
    stdout: Option<bool>,
    /// Ignore rainconfig
    #[arg(long)]
    ignore_rainconfig: Option<bool>,
    /// Path to the rainconfig json file that contains configurations, see
    /// './example.rainconfig.json' for more details.
    /// default is './rainconfig.json' if not specified
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Force compile by ignoring all erroneous paths/contents specified in rainconfig
    #[arg(short, long)]
    force: Option<bool>,
    /// Only use local meta and deployers specified in rainconfig and dont search for them in subgraphs
    #[arg(short, long)]
    local_data_only: Option<bool>,
}

/// rainconfig available commands
#[derive(Subcommand, Debug)]
pub enum Rainconfig {
    /// Prints general info about rainconfig
    Info,
    /// Prints all known rainconfig field names
    PrintAll,
    /// Prints info about 'src' field
    Src,
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
pub async fn dispatch(cli: RainCompilerCli) -> anyhow::Result<()> {
    let local_data_only = if let Some(v) = cli.local_data_only {
        v
    } else {
        false
    };
    let force = if let Some(v) = cli.force { v } else { false };
    if let Some(subcmd) = cli.subcmd {
        match subcmd {
            SubCommands::Target(opts) => {
                target_compile(opts, cli.config, local_data_only, force).await?;
            }
            SubCommands::Rainconfig(v) => match v {
                Rainconfig::Info => println!("{}", rainconfig::RAINCONFIG_DESCRIPTION),
                Rainconfig::PrintAll => println!(
                    "{}",
                    ["- src", "- include", "- subgraphs", "- meta", "- deployers"].join("\n")
                ),
                Rainconfig::Src => println!("{}", rainconfig::RAINCONFIG_SRC_DESCRIPTION),
                Rainconfig::Include => println!("{}", rainconfig::RAINCONFIG_INCLUDE_DESCRIPTION),
                Rainconfig::Subgraphs => {
                    println!("{}", rainconfig::RAINCONFIG_SUBGRAPHS_DESCRIPTION)
                }
                Rainconfig::Meta => println!("{}", rainconfig::RAINCONFIG_META_DESCRIPTION),
                Rainconfig::Deployers => {
                    println!("{}", rainconfig::RAINCONFIG_DEPLOYERS_DESCRIPTION)
                }
            },
        }
    } else {
        rainconfig_compile(cli.config, local_data_only, force).await?;
    };
    Ok(())
}

pub async fn main() -> anyhow::Result<()> {
    tracing::subscriber::set_global_default(tracing_subscriber::fmt::Subscriber::new())?;
    let cli = RainCompilerCli::parse();
    dispatch(cli).await
}
