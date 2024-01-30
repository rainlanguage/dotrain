{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rainix.url = "github:rainprotocol/rainix/dc51d8875334c47256082363184b8e7d74ec456e";
  };

  outputs = { self, flake-utils, rainix }:

  flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = rainix.pkgs.${system};
    in rec {
      packages = {
        build-bin = (pkgs.makeRustPlatform{
          rustc = rainix.rust-toolchain.${system};
          cargo = rainix.rust-toolchain.${system};
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
          buildInputs = with pkgs; [
            openssl
          ];
          nativeBuildInputs = with pkgs; [
            pkg-config
          ] ++ lib.optionals stdenv.isDarwin [
            darwin.apple_sdk.frameworks.SystemConfiguration
          ];
        };
      } // rainix.packages.${system};

      # # For `nix build` & `nix run`:
      defaultPackage = packages.build-bin;

      # For `nix develop`:
      devShells = rainix.devShells.${system};
    }
  );
}