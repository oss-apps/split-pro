{
  description = "SplitPro development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          node = pkgs.nodejs_22;
          postgres = pkgs.postgresql_18.withPackages (extensions: [ extensions.pg_cron ]);
          pnpm = pkgs.stdenvNoCC.mkDerivation {
            pname = "pnpm";
            version = "10.11.0";
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/pnpm/-/pnpm-10.11.0.tgz";
              hash = "sha256-pp6csHfaQZ1H0Y8d1S4gckWynKxuB2rO2+uL47Gme9c=";
            };
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              mkdir -p "$out/lib/pnpm" "$out/bin"
              cp -r . "$out/lib/pnpm/"
              makeWrapper ${node}/bin/node "$out/bin/pnpm" \
                --add-flags "$out/lib/pnpm/bin/pnpm.cjs"
              makeWrapper ${node}/bin/node "$out/bin/pnpx" \
                --add-flags "$out/lib/pnpm/bin/pnpx.cjs"
            '';
          };
          # npm downloads standard Linux binaries (Prisma, SWC, tsgo, oxlint, etc.).
          # Run Node commands in an FHS environment instead of modifying node_modules
          # or substituting a different version of Prisma's engines.
          runtime = pkgs.buildFHSEnv {
            name = "splitpro-node-runtime";
            # Prisma uses os-release to choose its downloadable engine target.
            # This runtime supplies glibc and OpenSSL 3, matching Debian 12.
            extraBuildCommands = ''
              cat > "$out/etc/os-release" <<'EOF'
              ID=debian
              VERSION_ID=12
              EOF
            '';
            targetPkgs = p: [
              node
              pnpm
              postgres
              p.git
              p.openssl
              p.cacert
              p.stdenv.cc.cc.lib
              p.zlib
              p.bash
              p.coreutils
              p.findutils
              p.gnugrep
              p.gnused
            ];
            runScript = pkgs.writeShellScript "splitpro-node-exec" ''
              exec "$@"
            '';
          };
          nodeTools = pkgs.runCommand "splitpro-node-tools" { } ''
            mkdir -p "$out/bin"
            ${pkgs.lib.concatMapStringsSep "\n"
              (command: ''
                cat > "$out/bin/${command}" <<'EOF'
                #!${pkgs.bash}/bin/bash
                exec ${runtime}/bin/splitpro-node-runtime ${
                  if command == "pnpm" || command == "pnpx" then pnpm else node
                }/bin/${command} "$@"
                EOF
                chmod +x "$out/bin/${command}"
              '')
              [
                "node"
                "npm"
                "npx"
                "pnpm"
                "pnpx"
              ]
            }
          '';
        in
        {
          default = pkgs.mkShell {
            packages = [
              nodeTools
              postgres
              pkgs.git
              pkgs.openssl
              pkgs.nixfmt-rfc-style
            ];
            SPLITPRO_NATIVE_POSTGRES = "1";
            shellHook = ''
              export SPLITPRO_ROOT="$PWD"
              export NEXT_TELEMETRY_DISABLED=1
            '';
          };
        }
      );
    };
}
