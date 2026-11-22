{
  config,
  lib,
  pkgs,
  ...
}:
let
  inherit (lib)
    types
    mkOption
    mkIf
    mkMerge
    mkDefault
    optional
    optionalAttrs
    optionalString
    concatMap
    concatMapStrings
    nameValuePair
    listToAttrs
    getAttrFromPath
    setAttrByPath
    recursiveUpdate
    foldl'
    last
    init
    attrNames
    mapAttrsToList
    hasPrefix
    literalExpression
    ;

  cfg = config.services.split-pro;
  opt = "services.split-pro";
  table = import ./env-table.nix { inherit lib; };
  inherit (table) rows;

  # ---- options generated from the table ----
  showPath = path: "${opt}.${lib.concatStringsSep "." path}";
  filePath = row: init row.path ++ [ "${last row.path}File" ];
  envDoc = row: "\n\nSets `${row.env}`.";

  rowOptions =
    row:
    let
      name = last row.path;
    in
    if row.secret then
      {
        ${name} = mkOption {
          type = types.nullOr row.type;
          default = null;
          description =
            row.description
            + envDoc row
            + "\n\nThe value ends up world-readable in the Nix store. Prefer {option}`${showPath (filePath row)}`.";
        };
        "${name}File" = mkOption {
          type = types.nullOr types.path;
          default = null;
          example = "/run/secrets/split-pro/${lib.toLower row.env}";
          description = ''
            File containing the value of {option}`${showPath row.path}`.
            The file is passed to the service as a systemd credential, so it can be owned by root.

            Sets `${row.env}`.
          '';
        };
      }
    else
      {
        ${name} = mkOption (
          {
            type = if row.default == null then types.nullOr row.type else row.type;
            inherit (row) default;
            description = row.description + envDoc row;
          }
          // optionalAttrs (row ? example) { inherit (row) example; }
        );
      };

  tableOptions = foldl' (
    acc: row: recursiveUpdate acc (setAttrByPath (init row.path) (rowOptions row))
  ) { } rows;

  # ---- rendering ----
  get = path: getAttrFromPath path cfg;
  render = v: if builtins.isBool v then lib.boolToString v else toString v;

  plainEnv = listToAttrs (
    concatMap (
      row: optional (get row.path != null) (nameValuePair row.env (render (get row.path)))
    ) rows
  );
  secretFiles = listToAttrs (
    concatMap (
      row:
      optional (row.secret && get (filePath row) != null) (nameValuePair row.env (get (filePath row)))
    ) rows
  );

  db = cfg.database;
  pg = config.services.postgresql;
  # True when the database runs on this machine's services.postgresql.
  localDb = db.createLocally || db.configurePgCron;
  uploadDir = cfg.uploads.directory;
  uploadDirInState = hasPrefix "/var/lib/split-pro/" uploadDir;

  # Connect over the local Unix socket with peer authentication. PostgreSQL names the socket
  # file after the port, so the URL has to carry the port too.
  localDatabaseUrl = "postgresql://${db.user}@localhost:${toString pg.settings.port}/${db.name}?host=${lib.strings.escapeURL db.socketDir}";

  # Address that the managed nginx proxies to. If the app listens on a wildcard address, nginx
  # connects over loopback. IPv6 addresses need brackets in the URL.
  proxyHost =
    if cfg.host == "0.0.0.0" then
      "127.0.0.1"
    else if cfg.host == "::" then
      "[::1]"
    else if lib.hasInfix ":" cfg.host then
      "[${cfg.host}]"
    else
      cfg.host;

  app = "${cfg.package}/share/split-pro";
  node = lib.getExe (cfg.package.nodejs or pkgs.nodejs_22);

  start = pkgs.writeShellApplication {
    name = "split-pro-start";
    text = ''
      # Secrets from *File options, passed in as systemd credentials.
      ${concatMapStrings (var: ''
        ${var}=$(< "$CREDENTIALS_DIRECTORY/${var}")
        export ${var}
      '') (attrNames secretFiles)}

      ${optionalString cfg.autoGenerateSecrets ''
        # Generate the secret once and keep it in the state directory, so that sessions stay
        # valid across restarts.
        if [ -z "''${NEXTAUTH_SECRET:-}" ]; then
          f="$STATE_DIRECTORY/nextauth-secret"
          if [ ! -s "$f" ]; then
            (umask 077 && ${node} -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))' > "$f.tmp" && mv "$f.tmp" "$f")
          fi
          NEXTAUTH_SECRET=$(< "$f")
          export NEXTAUTH_SECRET
        fi
      ''}

      ${optionalString cfg.pushNotifications.autoGenerateKeys ''
        if [ -n "''${WEB_PUSH_EMAIL:-}" ] && [ -z "''${WEB_PUSH_PUBLIC_KEY:-}" ] && [ -z "''${WEB_PUSH_PRIVATE_KEY:-}" ]; then
          f="$STATE_DIRECTORY/vapid.json"
          if [ ! -s "$f" ]; then
            (umask 077 && ${node} -e 'process.stdout.write(JSON.stringify(require(process.argv[1]).generateVAPIDKeys()))' ${app}/node_modules/web-push > "$f.tmp" && mv "$f.tmp" "$f")
          fi
          WEB_PUSH_PUBLIC_KEY=$(${node} -p 'require(process.argv[1]).publicKey' "$f")
          WEB_PUSH_PRIVATE_KEY=$(${node} -p 'require(process.argv[1]).privateKey' "$f")
          export WEB_PUSH_PUBLIC_KEY WEB_PUSH_PRIVATE_KEY
        fi
      ''}

      exec ${lib.getExe cfg.package}
    '';
  };
in
{
  meta = {
    # nixpkgs: `maintainers = [ lib.maintainers.krokosik ];` once the maintainer entry exists.
    maintainers = lib.optional (lib.maintainers ? krokosik) lib.maintainers.krokosik;
    doc = ./split-pro.md;
  };

  options.services.split-pro = recursiveUpdate tableOptions {
    enable = lib.mkEnableOption "SplitPro, an open source alternative to Splitwise";

    package = mkOption {
      type = types.package;
      default = pkgs.split-pro;
      defaultText = literalExpression "pkgs.split-pro";
      description = "The SplitPro package to use.";
    };

    openFirewall = mkOption {
      type = types.bool;
      default = false;
      description = "Open {option}`${opt}.port` in the firewall.";
    };

    autoGenerateSecrets = mkOption {
      type = types.bool;
      default = true;
      description = ''
        If nothing else provides `NEXTAUTH_SECRET`, generate one on first start and store it in
        `/var/lib/split-pro/nextauth-secret`. Disable this to make the service fail when no
        secret is configured.
      '';
    };

    pushNotifications.autoGenerateKeys = mkOption {
      type = types.bool;
      default = true;
      description = ''
        If {option}`${opt}.pushNotifications.email` is set but neither VAPID key is configured,
        generate a key pair once and store it in `/var/lib/split-pro/vapid.json`.
      '';
    };

    recurrence.timeZone = mkOption {
      type = types.str;
      default = "UTC";
      example = "Europe/Warsaw";
      description = ''
        Time zone in which pg_cron runs the jobs that create recurring expenses
        (`cron.timezone`). Only applied when {option}`${opt}.database.configurePgCron` is enabled.
      '';
    };

    environment = mkOption {
      type = types.attrsOf types.str;
      default = { };
      example = {
        NEXTAUTH_URL_INTERNAL = "http://127.0.0.1:3000";
      };
      description = ''
        Extra environment variables, applied after the typed options. Use this for variables
        that have no dedicated option. The values end up in the Nix store, so don't put secrets
        here.

        Don't set `PORT` or `HOSTNAME` here (or in {option}`${opt}.environmentFiles`):
        {option}`${opt}.port` and {option}`${opt}.host` also configure the managed nginx proxy
        and firewall.
      '';
    };

    environmentFiles = mkOption {
      type = types.listOf types.path;
      default = [ ];
      example = [ "/run/secrets/split-pro.env" ];
      description = ''
        Files with `KEY=value` lines that systemd loads into the service environment, for
        example a sops-nix template. Values from these files override the typed options and
        {option}`${opt}.environment`, and the `*File` options override these files in turn.
        Don't set `PORT` or `HOSTNAME` in them; see {option}`${opt}.environment`.
      '';
    };

    database = {
      createLocally = mkOption {
        type = types.bool;
        default = true;
        description = ''
          Create a local PostgreSQL database and role named `split-pro` and connect over the
          Unix socket with peer authentication. To use another server, disable this and provide a
          complete `DATABASE_URL` through {option}`${opt}.environmentFiles`.
        '';
      };
      socketDir = mkOption {
        type = types.str;
        default = "/run/postgresql";
        description = ''
          Directory that holds the local PostgreSQL server's Unix socket. Used by
          {option}`${opt}.database.createLocally` and {option}`${opt}.database.configurePgCron`.
          Change it only if you moved the socket with
          `services.postgresql.settings.unix_socket_directories`.
        '';
      };
      name = mkOption {
        type = types.str;
        default = "split-pro";
        description = ''
          Database name. It must be `split-pro` when {option}`${opt}.database.createLocally` is
          enabled. Otherwise only {option}`${opt}.database.configurePgCron` uses it.
        '';
      };
      user = mkOption {
        type = types.str;
        default = "split-pro";
        description = ''
          Database role. It must be `split-pro` when {option}`${opt}.database.createLocally` is
          enabled. Otherwise only {option}`${opt}.database.configurePgCron` uses it.
        '';
      };
      configurePgCron = mkOption {
        type = types.bool;
        default = cfg.database.createLocally;
        defaultText = literalExpression "config.${opt}.database.createLocally";
        description = ''
          Set up pg_cron, which recurring expenses need, on the local
          {option}`services.postgresql`. The module loads the extension, creates it in
          {option}`${opt}.database.name` and grants the database role the access that SplitPro
          needs. Enable this for a local server that you manage yourself.

          For a remote server, do the same by hand. Set `shared_preload_libraries = 'pg_cron'`,
          `cron.database_name = '<db>'` and `cron.use_background_workers = on`, run
          `CREATE EXTENSION pg_cron;`, and apply the grants listed in the module documentation.
          Without background workers, pg_cron needs a connection that works without a password,
          and recurring expenses fail without any visible error.

          The setup runs in `split-pro-db-setup.service`, so a mistake here makes only SplitPro
          fail, not `postgresql.target`. If the host already lists `pg_cron` in
          `services.postgresql.settings.shared_preload_libraries`, remove that entry.
        '';
      };
    };

    uploads.directory = mkOption {
      type = types.path;
      default = "/var/lib/split-pro/uploads";
      example = "/srv/split-pro/uploads";
      description = ''
        Directory for uploaded receipts and avatars (`UPLOAD_DIR`). If the path is outside
        `/var/lib/split-pro`, the module creates it and makes it writable for the service.
        The module documentation explains how to move uploads over from the Docker image.
      '';
    };

    nginx = {
      enable = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Put nginx in front of SplitPro. To add TLS, configure
          `services.nginx.virtualHosts.<hostName>` as usual.
        '';
      };
      hostName = mkOption {
        type = types.str;
        example = "split.example.com";
        description = "Virtual host name used for the nginx proxy.";
      };
    };
  };

  config = mkIf cfg.enable (mkMerge [
    {
      assertions = [
        {
          assertion = cfg.url != null || cfg.environmentFiles != [ ] || cfg.environment ? NEXTAUTH_URL;
          message = "${opt}.url must be set.";
        }
        {
          assertion = !(cfg.environment ? PORT || cfg.environment ? HOSTNAME);
          message = "Set ${opt}.port and ${opt}.host instead of PORT and HOSTNAME in ${opt}.environment. nginx and the firewall only use the typed options.";
        }
        {
          assertion = cfg.database.createLocally -> cfg.database.user == "split-pro";
          message = "${opt}.database.user must be \"split-pro\" when database.createLocally is enabled, because peer authentication needs the role to match the system user.";
        }
        {
          assertion = cfg.database.createLocally -> cfg.database.name == cfg.database.user;
          message = "${opt}.database.name must equal database.user when database.createLocally is enabled, because ensureDBOwnership requires it.";
        }
        {
          assertion =
            !cfg.database.createLocally -> cfg.environmentFiles != [ ] || cfg.environment ? DATABASE_URL;
          message = "${opt}: when database.createLocally is disabled, provide DATABASE_URL through ${opt}.environmentFiles.";
        }
      ]
      ++ map (row: {
        assertion = !(get row.path != null && get (filePath row) != null);
        message = "${showPath row.path} and ${showPath (filePath row)} are mutually exclusive.";
      }) (lib.filter (r: r.secret) rows);

      warnings = map (
        row:
        "${showPath row.path} is world-readable in the Nix store; use ${showPath (filePath row)} instead."
      ) (lib.filter (r: r.secret && get r.path != null) rows);

      users.users.split-pro = {
        isSystemUser = true;
        group = "split-pro";
        home = "/var/lib/split-pro";
      };
      users.groups.split-pro = { };

      systemd.services.split-pro = {
        description = "SplitPro";
        wantedBy = [ "multi-user.target" ];
        wants = [ "network-online.target" ];
        after = [
          "network-online.target"
        ]
        ++ optional localDb "postgresql.target"
        ++ optional db.configurePgCron "split-pro-db-setup.service";
        requires =
          optional localDb "postgresql.target" ++ optional db.configurePgCron "split-pro-db-setup.service";

        # systemd treats `%` in Environment= as the start of a specifier. A URL-encoded `%2F`, for
        # example, is an invalid specifier and systemd drops the whole variable. Escape every `%`.
        environment = lib.mapAttrs (_: lib.replaceStrings [ "%" ] [ "%%" ]) (
          plainEnv
          // {
            NODE_ENV = "production";
            UPLOAD_DIR = toString uploadDir;
          }
          // optionalAttrs db.createLocally { DATABASE_URL = localDatabaseUrl; }
          // cfg.environment
        );

        serviceConfig = {
          ExecStart = lib.getExe start;
          User = "split-pro";
          Group = "split-pro";
          StateDirectory = "split-pro";
          StateDirectoryMode = "0750";
          CacheDirectory = "split-pro";
          WorkingDirectory = "/var/lib/split-pro";
          ReadWritePaths = lib.optional (!uploadDirInState) uploadDir;
          EnvironmentFile = cfg.environmentFiles;
          LoadCredential = mapAttrsToList (var: path: "${var}:${path}") secretFiles;
          Restart = "on-failure";
          RestartSec = 5;

          # Hardening
          CapabilityBoundingSet = "";
          DevicePolicy = "closed";
          LockPersonality = true;
          NoNewPrivileges = true;
          PrivateDevices = true;
          PrivateTmp = true;
          ProcSubset = "pid";
          ProtectClock = true;
          ProtectControlGroups = true;
          ProtectHome = true;
          ProtectHostname = true;
          ProtectKernelLogs = true;
          ProtectKernelModules = true;
          ProtectKernelTunables = true;
          ProtectProc = "invisible";
          ProtectSystem = "strict";
          RemoveIPC = true;
          RestrictAddressFamilies = [
            "AF_INET"
            "AF_INET6"
            "AF_UNIX"
          ];
          RestrictNamespaces = true;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          SystemCallArchitectures = "native";
          SystemCallFilter = [
            "@system-service"
            "~@privileged"
          ];
          UMask = "0027";
        };
      };

      systemd.tmpfiles.settings.split-pro = mkIf (!uploadDirInState) {
        ${toString uploadDir}.d = {
          user = "split-pro";
          group = "split-pro";
          mode = "0750";
        };
      };

      networking.firewall.allowedTCPPorts = optional cfg.openFirewall cfg.port;
    }

    (mkIf cfg.database.createLocally {
      services.postgresql = {
        enable = true;
        ensureDatabases = [ cfg.database.name ];
        ensureUsers = [
          {
            name = cfg.database.user;
            ensureDBOwnership = true;
          }
        ];
      };
    })

    (mkIf cfg.database.configurePgCron {
      services.postgresql = {
        extensions = ps: [ ps.pg_cron ];
        settings = {
          shared_preload_libraries = [ "pg_cron" ];
          "cron.database_name" = cfg.database.name;
          "cron.timezone" = cfg.recurrence.timeZone;
          # Run jobs in background workers. Otherwise pg_cron opens a new connection for every
          # job and has to authenticate as the job's owner.
          "cron.use_background_workers" = true;
          "cron.max_running_jobs" = mkDefault 8;
          max_worker_processes = mkDefault 24;
        };
      };

      # Only a superuser can create the extension. Once it exists, the app's migration skips it.
      # This runs in its own unit so that a typo here makes only SplitPro fail, and not the other
      # services that depend on postgresql.target.
      systemd.services.split-pro-db-setup = {
        description = "SplitPro database setup (pg_cron)";
        requires = [ "postgresql.target" ];
        after = [ "postgresql.target" ];
        before = [ "split-pro.service" ];
        path = [ pg.finalPackage ];
        environment = {
          # The setup always connects through the local socket as postgres, with peer
          # authentication, even when the app itself connects over TCP with a password.
          PGHOST = db.socketDir;
          PGPORT = toString pg.settings.port;
          DB_NAME = db.name;
          DB_USER = db.user;
        };
        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          User = "postgres";
          Group = "postgres";
        };
        # Names are passed to psql as variables (:'x' quotes a literal, :"x" an identifier), so
        # they are never pasted into the SQL as text.
        script = ''
          psql --dbname="$DB_NAME" -v ON_ERROR_STOP=1 -v role="$DB_USER" <<'EOF'
            SELECT pg_is_in_recovery() AS standby \gset
            \if :standby
              \echo 'standby server, skipping pg_cron setup'
              \quit
            \endif
            CREATE EXTENSION IF NOT EXISTS pg_cron;
            -- pg_cron already lets every role read cron.job and cron.job_run_details.
            -- In addition, the app needs:
            --  * USAGE on the schema, to call cron.schedule and cron.unschedule.
            --  * EXECUTE on cron.alter_job, which pg_cron revokes from public. The app calls it
            --    when RECURRENCE_TIME or a recurrence changes. The function still refuses to
            --    change jobs that belong to other roles.
            --  * UPDATE on cron.job.schedule, because a migration rewrites that column.
            --  * REFERENCES on cron.job(jobid), because "ExpenseRecurrence"."jobId" has a foreign
            --    key to it.
            GRANT USAGE ON SCHEMA cron TO :"role";
            GRANT EXECUTE ON FUNCTION cron.alter_job(bigint, text, text, text, text, boolean) TO :"role";
            GRANT UPDATE (schedule), REFERENCES (jobid) ON cron.job TO :"role";
          EOF
        '';
      };
    })

    (mkIf cfg.nginx.enable {
      services.nginx = {
        enable = true;
        virtualHosts.${cfg.nginx.hostName}.locations."/" = {
          proxyPass = "http://${proxyHost}:${toString cfg.port}";
          proxyWebsockets = true;
          # Set per location, so that other virtual hosts keep their own settings.
          recommendedProxySettings = true;
          # nginx limits the size of the whole multipart request, but the app limits only the
          # file, so leave some headroom. 10 MB is the app's default UPLOAD_MAX_FILE_SIZE_MB
          # (src/env.ts).
          extraConfig = ''
            client_max_body_size ${
              toString ((if cfg.uploads.maxFileSizeMb != null then cfg.uploads.maxFileSizeMb else 10) + 2)
            }M;
          '';
        };
      };
    })
  ]);
}
