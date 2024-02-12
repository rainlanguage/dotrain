#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotrain::cli::main().await
}