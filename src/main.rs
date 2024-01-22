pub mod cli;
pub mod types;
pub mod error;
pub mod parser;
pub mod composer;

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    cli::main().await
}
