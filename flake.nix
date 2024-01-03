{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    naersk.url = "github:nix-community/naersk";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, flake-utils, naersk, nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import nixpkgs) {
          inherit system;
        };

        naersk' = pkgs.callPackage naersk {
          # cargo = pkgs.cargo;
          # rustc = pkgs.rustc;
        };

      in rec {
        
        # shell commands
        packages = rec {
          # dotrain = pkgs.writeShellScriptBin "dotrain" ''
          #   ${defaultPackage}/bin/dotrain
          # '';

          test = pkgs.writeShellScriptBin "test" ''
            npm test
          '';

          flush = pkgs.writeShellScriptBin "flush" ''
            rm -rf dist
            rm -rf docs
            rm -rf temp
          '';

          hard-flush = pkgs.writeShellScriptBin "hard-flush" ''
            rm -rf dist
            rm -rf docs
            rm -rf temp
            rm -rf target
            rm -rf node_modules
          '';

          ci-test = pkgs.writeShellScriptBin "ci-test" ''
            ${hard-flush}/bin/hard-flush
            npm install
            npm run build
            npm test
          '';

          build-wasm = pkgs.writeShellScriptBin "build-wasm" ''
            npm run build-wasm
          '';

          node-bg = pkgs.writeShellScriptBin "node-bg" ''
            npm run node-bg
          '';

          web-bg = pkgs.writeShellScriptBin "web-bg" ''
            npm run web-bg
          '';

          build-bindings = pkgs.writeShellScriptBin "build-bindings" ''
            npm run build-bindings
          '';

          build = pkgs.writeShellScriptBin "build" ''
            npm run build
          '';

          hard-build = pkgs.writeShellScriptBin "hard-build" ''
            ${hard-flush}/bin/hard-flush
            npm install
            npm run build
          '';

          docgen = pkgs.writeShellScriptBin "docgen" ''
            npm run docgen
          '';

          lint = pkgs.writeShellScriptBin "lint" ''
            npm run lint
          '';

          lint-fix = pkgs.writeShellScriptBin "lint-fix" ''
            npm run lint-fix
          '';

          lint-bindings = pkgs.writeShellScriptBin "lint-bindings" ''
            npm run lint-bindings
          '';
        };
        
        # defaultPackage = pkgs.stdenv.mkDerivation {
        #   nativeBuildInputs = with pkgs; [ 
        #     iconv 
        #     # rustup
        #     rustc
        #     cargo
        #   ] ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
        #     pkgs.libiconv
        #     pkgs.darwin.apple_sdk.frameworks.Security
        #     pkgs.darwin.apple_sdk.frameworks.CoreServices
        #     pkgs.darwin.apple_sdk.frameworks.CoreFoundation
        #     pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        #   ]);
        #   name = "dotrain";
        #   src = self;
        #   buildPhase = ''
        #   ls -l ../../../
          
          
          
        #   cargo build --bin dotrain --all-features
        #   '';
        #   installPhase = "mkdir -p $out/bin; install -t $out/bin dotrain";
        # };
        # # For `nix build` & `nix run`:
        defaultPackage = naersk'.buildPackage {
          src = ./.;
          # root = ./.;
          # release = false;
          # copyBins = true;
          # copyLibs = false;
          # singleStep = true;
          # remapPathPrefix = false;
          nativeBuildInputs = with pkgs; [ 
            gmp 
            iconv 
            rustup
            openssl 
            pkg-config
          ] ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
          pkgs.libiconv
          pkgs.darwin.apple_sdk.frameworks.Security
          pkgs.darwin.apple_sdk.frameworks.CoreServices
          pkgs.darwin.apple_sdk.frameworks.CoreFoundation
          pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        ]);
          cargoBuildOptions = (prev: prev ++ [ "--all-features" ]);
        };

        # For `nix develop`:
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [ 
            iconv 
            rustup
            emscripten
            nodejs-18_x
            wasm-bindgen-cli
          ] ++ (with packages; [
            # dotrain
            build
            hard-build
            build-wasm
            build-bindings
            node-bg
            web-bg
            test
            ci-test
            flush
            hard-flush
            docgen
            lint
            lint-fix
            lint-bindings
          ]) ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
            pkgs.libiconv
            pkgs.darwin.apple_sdk.frameworks.Security
            pkgs.darwin.apple_sdk.frameworks.CoreServices
            pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
          ]);
          shellHook = '' npm install '';
        };
      }
    );
}
