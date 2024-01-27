#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    dotrain::cli::main().await
}
