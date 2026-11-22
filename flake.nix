{
  description = "SplitPro development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

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
            version = "12.18.0";
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@pnpm/exe.linux-${
                if system == "x86_64-linux" then "x64" else "arm64"
              }/-/exe.linux-${if system == "x86_64-linux" then "x64" else "arm64"}-12.18.0.tgz";
              hash =
                if system == "x86_64-linux" then
                  "sha512-OJ+X2wcraldCwj75pCIerWARQSRpdfj0eBTs/2ODyhfeW46ylOnjTIE/GKra6Mn6E72/gBmXS8igrUioa+F9fQ=="
                else
                  "sha512-2dpyVBCHT+FfpuQh9i+7MXAqNWYLCvD5vYr5p6Eimxoga8USLnjbUgyj72AOrO0hjc5ri3TEFP3jiyBHjkSZpQ==";
            };
            payload = pkgs.fetchurl {
              url = "https://registry.npmjs.org/pnpm/-/pnpm-12.18.0.tgz";
              hash = "sha512-nXiC1dyCFH7PxOBiqjSDTgrQKWcQoYN6ERWuASEn02txCeMhrBWYod0KZVl2gbHpmRfhLtDXSerpEYeUM2O+sw==";
            };
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              mkdir -p "$out/bin"
              tar -xzf "$payload" -C "$out/bin" --strip-components=1
              install -m755 pnpm "$out/bin/pnpm"
              makeWrapper "$out/bin/pnpm" "$out/bin/pnpx" --add-flags dlx
            '';
          };
          # npm downloads standard Linux binaries (Prisma, SWC, tsc, oxlint, etc.).
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
              p.glib
              p.nss
              p.nspr
              p.dbus
              p.atk
              p.at-spi2-atk
              p.cups
              p.libdrm
              p.expat
              p.libxkbcommon
              p.libx11
              p.libxcomposite
              p.libxdamage
              p.libxext
              p.libxfixes
              p.libxrandr
              p.libxcb
              p.mesa
              p.libgbm
              p.udev
              p.pango
              p.cairo
              p.alsa-lib
              p.fontconfig
              p.freetype
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
              pkgs.nixfmt
              pkgs.dejavu_fonts
            ];
            SPLITPRO_NATIVE_POSTGRES = "1";
            shellHook = ''
              export SPLITPRO_ROOT="$PWD"
              export NEXT_TELEMETRY_DISABLED=1
              # libpq defaults should point at this checkout, just like dx:up.
              # Node reads .env as data and preserves exported overrides.
              export PGHOST="''${PGHOST:-$SPLITPRO_ROOT/.direnv/postgres}"
              PGPORT="$(node --env-file-if-exists=.env -p 'process.env.PGPORT ?? process.env.POSTGRES_PORT ?? "5432"')"
              PGUSER="$(node --env-file-if-exists=.env -p 'process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres"')"
              PGDATABASE="$(node --env-file-if-exists=.env -p 'process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "splitpro"')"
              export PGPORT PGUSER PGDATABASE
            '';
          };
        }
      );
    };
}
