pub mod cli;
pub mod types;
pub mod parser;
pub mod compiler;

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    cli::main().await
}
