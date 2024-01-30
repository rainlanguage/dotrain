{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rainix.url = "github:rainprotocol/rainix";
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
      devShells = {
        js = pkgs.mkShell {
          nativeBuildInputs = [
            rainix.rust-toolchain.${system}
            rainix.rust-build-inputs.${system}
            rainix.node-build-inputs.${system}
          ] ++ (with pkgs; [ 
            wasm-bindgen-cli
            (writeShellScriptBin "flush" ''
              rm -rf dist
              rm -rf docs
              rm -rf temp
            '')
            (writeShellScriptBin "hard-flush" ''
              rm -rf dist
              rm -rf docs
              rm -rf temp
              rm -rf target
              rm -rf node_modules
            '')
            (writeShellScriptBin "hard-build" ''
              hard-flush
              npm install
              npm run build
            '')
          ]);
          shellHook = '' npm install '';
        };
      } // rainix.devShells.${system};
    }
  );
}