use std::path::PathBuf;
use clap::{Parser, Subcommand, command};
use compile::{target_compile, rainconfig_compile};

pub mod compile;
pub mod rainconfig;

#[derive(Parser, Debug)]
#[command(author, version, about = "iuyt", long_about = None)]
pub struct RainCompilerCli {
    /// Path to the rainconfig json file(default is './rainconfig.json'
    /// if not specified) that contains configurations, see
    /// './example.rainconfig.json' for more details.
    #[arg(short, long, global = true)]
    config: Option<PathBuf>,
    /// only use local meta
    #[arg(short, long, global = true)]
    local_meta_only: bool,
    #[command(subcommand)]
    subcmd: Option<SubCommands>,
}

#[derive(Subcommand, Debug)]
pub enum SubCommands {
    Target(Target),
    Rainonfig {},
}

/// command for validating a meta
// #[derive(Subcommand)]
#[derive(Parser, Debug)]
pub struct Target {
    /// input
    #[arg(short, long)]
    input: PathBuf,
    /// output
    #[arg(short, long)]
    output: PathBuf,
    /// entrypoints
    #[arg(short, long)]
    entrypoints: Vec<String>,
    /// log results
    #[arg(short, long)]
    stdout: Option<bool>,
    /// config file
    // #[arg(short, long)]
    // config: Option<PathBuf>,
    /// ignore rainconfig
    #[arg(long)]
    ignore_rainconfig: Option<bool>,
}

pub async fn dispatch(cli: RainCompilerCli) -> anyhow::Result<()> {
    if let Some(subcmd) = cli.subcmd {
        match subcmd {
            SubCommands::Target(opts) => {
                target_compile(opts, cli.config, cli.local_meta_only).await?;
            }
            _ => {}
        }
    } else {
        rainconfig_compile(cli.config, cli.local_meta_only).await?;
    };
    Ok(())
}

pub async fn main() -> anyhow::Result<()> {
    // tracing::subscriber::set_global_default(tracing_subscriber::fmt::Subscriber::new())?;
    // clap::
    let cli = RainCompilerCli::parse();
    dispatch(cli).await
}
