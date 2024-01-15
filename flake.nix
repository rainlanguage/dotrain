{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rainix.url = "github:rainprotocol/rainix/dc51d8875334c47256082363184b8e7d74ec456e";
  };

  outputs = { self, flake-utils, rainix }:

  flake-utils.lib.eachDefaultSystem (system:
    let
    in rec {
      # # For `nix build` & `nix run`:
      defaultPackage = (rainix.pkgs.makeRustPlatform{
        rustc = rainix.rust-toolchain;
        cargo = rainix.rust-toolchain;
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