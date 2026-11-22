{
  lib,
  stdenv,
  fetchFromGitHub,
  nodejs_22,
  pnpm_12,
  fetchPnpmDeps,
  pnpmConfigHook,
  makeBinaryWrapper,
  prisma-engines_7,
  openssl,
  nixosTests ? { },
  callPackage,
}:
let
  nodejs = nodejs_22;
  pnpm = pnpm_12;
in
stdenv.mkDerivation (finalAttrs: {
  pname = "split-pro";
  # Keep this in sync with package.json; the flake's `version` check fails if they differ.
  # In nixpkgs, nix-update bumps it.
  # TODO(nixpkgs): fill in the real src and pnpm hashes for the first release that includes nix/.
  # The flake replaces src, version and pnpmDeps with this checkout.
  version = "2.1.6";

  src = fetchFromGitHub {
    owner = "oss-apps";
    repo = "split-pro";
    tag = "v${finalAttrs.version}";
    hash = lib.fakeHash;
  };

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 5;
    hash = lib.fakeHash;
  };

  nativeBuildInputs = [
    makeBinaryWrapper
    nodejs
    pnpm
    pnpmConfigHook
    openssl
  ];

  env = {
    # Validating the environment at build time would need runtime secrets. The service validates
    # it at startup instead.
    SKIP_ENV_VALIDATION = "1";
    DOCKER_OUTPUT = "1";
    NEXT_TELEMETRY_DISABLED = "1";
    NEXT_PUBLIC_APP_VERSION = finalAttrs.version;
    # Prisma must never try to download engines inside the sandbox.
    PRISMA_SKIP_POSTINSTALL_GENERATE = "1";
    # The Prisma CLI from the lockfile needs the schema engine for `prisma generate` and would
    # otherwise download it. nixpkgs' prisma-engines_7 can be older than the lockfile's Prisma
    # (7.8 and 7.10 when this was written). That is fine because only `generate` uses it. At
    # runtime, SplitPro talks to PostgreSQL through @prisma/adapter-pg and runs migrations itself.
    PRISMA_SCHEMA_ENGINE_BINARY = "${prisma-engines_7}/bin/schema-engine";
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";
    CHECKPOINT_DISABLE = "1";
  };

  buildPhase = ''
    runHook preBuild
    # Without this, Next.js embeds a random build ID. The hash in the source's store path stays
    # the same for the same source and changes whenever the source changes.
    export NEXT_BUILD_ID=$(basename "$src" | cut -d- -f1)
    pnpm prisma generate
    pnpm build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    app=$out/share/split-pro
    mkdir -p $out/bin $app
    cp -r .next/standalone/. $app/
    mkdir -p $app/.next $app/prisma
    # Output tracing may already have copied some of these. `cp -T` merges into the existing
    # directory instead of nesting a second copy inside it.
    cp -rT .next/static $app/.next/static
    cp -rT public $app/public
    cp -rT prisma/migrations $app/prisma/migrations

    # Output tracing copies pnpm's hoisting symlinks but not every package that they point to.
    find $app/node_modules -xtype l -delete

    # Next.js writes its image optimisation cache below distDir, which is read-only here.
    rm -rf $app/.next/cache
    ln -s /var/cache/split-pro $app/.next/cache

    # `next build` embeds random keys for preview mode and Server Actions. See the script.
    node ${./normalize-next.cjs} $app/.next

    # DOCKER_OUTPUT=1 marks a standalone build. At runtime it also makes SplitPro apply its
    # bundled schema migrations on startup (src/migrations/index.ts), as the Docker image does.
    makeWrapper ${lib.getExe nodejs} $out/bin/split-pro \
      --add-flags $app/server.js \
      --set-default NODE_ENV production \
      --set DOCKER_OUTPUT 1 \
      --set-default NEXT_TELEMETRY_DISABLED 1

    runHook postInstall
  '';

  passthru = {
    inherit nodejs;
    tests = {
      envCoverage = callPackage ./env-coverage.nix { split-pro = finalAttrs.finalPackage; };
    }
    // lib.optionalAttrs (nixosTests ? split-pro) { nixos = nixosTests.split-pro; };
  };

  meta = {
    # nixpkgs: `maintainers = [ lib.maintainers.krokosik ];` once the maintainer entry exists.
    maintainers = lib.optional (lib.maintainers ? krokosik) lib.maintainers.krokosik;
    description = "Open source alternative to Splitwise";
    homepage = "https://github.com/oss-apps/split-pro";
    license = lib.licenses.mit;
    mainProgram = "split-pro";
    platforms = lib.platforms.linux;
  };
})
