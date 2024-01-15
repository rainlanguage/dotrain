{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rainix.url = "github:rainprotocol/rainix/0e292a0f56308bb35d4a51f6c3653aa65a926d35";
  };

  outputs = { self, flake-utils, rainix, rust-overlay }:

  flake-utils.lib.eachDefaultSystem (system:
    let

      overlays = [ (import rust-overlay) ];

      rust-version = "1.75.0";

      rust-toolchain = rainix.pkgs.rust-bin.stable.${rust-version}.default.override {
        targets = [ "wasm32-unknown-unknown" ];
      };

    in rec {
      # # For `nix build` & `nix run`:
      defaultPackage = (rainix.pkgs.makeRustPlatform{
        rustc = rust-toolchain;
        cargo = rust-toolchain;
      }).buildRustPackage {
        src = ./.;
        doCheck = false;
        name = "dotrain";
        cargoLock.lockFile = ./Cargo.lock;
        # allows for git deps to be resolved without the need to specify their outputHash
        cargoLock.allowBuiltinFetchGit = true;
        buildPhase = ''
          cargo build --release --bin dotrain --features cli
        '';
        installPhase = ''
          mkdir -p $out/bin
          cp target/release/dotrain $out/bin/
        '';
        buildInputs = with rainix.pkgs; [
          openssl
        ];
        nativeBuildInputs = with rainix.pkgs; [
          pkg-config
        ] ++ lib.optionals stdenv.isDarwin [
          darwin.apple_sdk.frameworks.SystemConfiguration
        ];
      };

      # For `nix develop`:
      devShells = rainix.devShells.${system};
    }
  );
}