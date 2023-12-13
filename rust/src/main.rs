pub mod cli;
pub mod types;
pub mod parser;
pub mod compiler;

// #[cfg(feature = "lsp")]
// pub mod lsp;
// #[cfg(feature = "js")]
// pub mod js_api;

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    cli::main().await
    // Ok(())
}
