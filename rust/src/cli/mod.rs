use std::path::PathBuf;
use clap::{Parser, Subcommand, command};
use compile::{target_compile, rainconfig_compile};

pub mod compile;
pub mod rainconfig;

#[derive(Parser, Debug)]
#[command(author, version, about = "iuyt", long_about = None)]
pub struct RainCompilerCli {
    /// Path to the rainconfig json file that contains configurations, see
    /// './example.rainconfig.json' for more details.
    /// default is './rainconfig.json' if not specified
    #[arg(short, long, global = true)]
    config: Option<PathBuf>,
    /// Only use local meta and deployers specified in rainconfig and dont search for them in subgraphs
    #[arg(short, long, global = true)]
    local_data_only: bool,
    #[command(subcommand)]
    subcmd: Option<SubCommands>,
}

#[derive(Subcommand, Debug)]
pub enum SubCommands {
    Target(Target),
    /// Prints 'rainconfig' info and description
    Rainconfig,
}

/// Command for targeting a single .rain file to compile with options
// #[derive(Subcommand)]
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
}

pub async fn dispatch(cli: RainCompilerCli) -> anyhow::Result<()> {
    if let Some(subcmd) = cli.subcmd {
        match subcmd {
            SubCommands::Target(opts) => {
                target_compile(opts, cli.config, cli.local_data_only).await?;
            }
            SubCommands::Rainconfig => {
                println!("{}", rainconfig::RAINCONFIG_DESCRIPTION);
            }
        }
    } else {
        rainconfig_compile(cli.config, cli.local_data_only).await?;
    };
    Ok(())
}

pub async fn main() -> anyhow::Result<()> {
    tracing::subscriber::set_global_default(tracing_subscriber::fmt::Subscriber::new())?;
    let cli = RainCompilerCli::parse();
    dispatch(cli).await
}
