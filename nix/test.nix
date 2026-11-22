# Imported by `runNixOSTest`. Expects `defaults` to import the module.
{ pkgs, ... }:
let
  dbPassword = "hunter2-with/special@chars";
in
{
  name = "split-pro";

  nodes = {
    # Zero-config: local database, generated NEXTAUTH_SECRET, managed nginx in front.
    local = {
      virtualisation.memorySize = 2048;
      services.split-pro = {
        enable = true;
        url = "http://local";
        nginx = {
          enable = true;
          hostName = "local";
        };
        # A small limit keeps the test uploads small. nginx then allows requests of up to
        # 1 + 2 = 3 MB.
        uploads.maxFileSizeMb = 1;
        # Email sign-in is enough for the app's check that at least one provider is configured.
        email = {
          from = "splitpro@example.com";
          server.host = "localhost";
          server.port = 25;
        };
        pushNotifications.email = "mailto:admin@example.com";
      };
      services.postgresql.settings = {
        # A non-default port: the app must use it to find the right socket.
        port = 5433;
        # On hosts that already preload pg_cron, the setting becomes "pg_cron,pg_cron". That
        # must still work.
        shared_preload_libraries = [ "pg_cron" ];
      };
    };

    # External PostgreSQL with password auth over TCP, pg_cron set up by hand.
    db = {
      networking.firewall.allowedTCPPorts = [ 5432 ];
      services.postgresql = {
        enable = true;
        enableTCPIP = true;
        extensions = ps: [ ps.pg_cron ];
        settings = {
          shared_preload_libraries = [ "pg_cron" ];
          "cron.database_name" = "splitpro";
          "cron.use_background_workers" = true;
          max_worker_processes = 24;
          "cron.max_running_jobs" = 8;
        };
        authentication = ''
          host splitpro splitpro 0.0.0.0/0 scram-sha-256
          host splitpro splitpro ::/0 scram-sha-256
        '';
        ensureDatabases = [ "splitpro" ];
        ensureUsers = [
          {
            name = "splitpro";
            ensureDBOwnership = true;
          }
        ];
      };
      systemd.services.postgresql-setup.script = pkgs.lib.mkAfter ''
        psql -v ON_ERROR_STOP=1 -c "ALTER USER splitpro PASSWORD '${dbPassword}'"
        psql -d splitpro -v ON_ERROR_STOP=1 <<'EOF'
          CREATE EXTENSION IF NOT EXISTS pg_cron;
          GRANT USAGE ON SCHEMA cron TO splitpro;
          GRANT EXECUTE ON FUNCTION cron.alter_job(bigint, text, text, text, text, boolean) TO splitpro;
          GRANT UPDATE (schedule), REFERENCES (jobid) ON cron.job TO splitpro;
        EOF
      '';
    };

    app = {
      virtualisation.memorySize = 2048;
      # As on osiris, the complete DATABASE_URL comes from a root-owned env file (a sops template).
      environment.etc."split-pro/env" = {
        text = "DATABASE_URL=postgresql://splitpro:${pkgs.lib.escapeURL dbPassword}@db:5432/splitpro\n";
        mode = "0400";
      };
      environment.etc."split-pro/nextauth-secret" = {
        text = "explicit-test-secret";
        mode = "0400";
      };
      environment.etc."split-pro/authentik-id" = {
        text = "test-client-id";
        mode = "0400";
      };
      environment.etc."split-pro/authentik-secret" = {
        text = "test-client-secret";
        mode = "0400";
      };
      services.split-pro = {
        enable = true;
        url = "http://app:3000";
        auth = {
          secretFile = "/etc/split-pro/nextauth-secret";
          disableEmailSignup = true;
          # As on osiris, the client credentials come from root-owned files.
          authentik = {
            clientIdFile = "/etc/split-pro/authentik-id";
            clientSecretFile = "/etc/split-pro/authentik-secret";
            issuer = "https://auth.example.com/application/o/split-pro/";
          };
        };
        database.createLocally = false;
        environmentFiles = [ "/etc/split-pro/env" ];
      };
    };
  };

  testScript =
    { nodes, ... }:
    let
      buildIdFile = "${nodes.local.services.split-pro.package}/share/split-pro/.next/BUILD_ID";
    in
    ''
      start_all()

      def via_nginx(path, extra=""):
          return f"curl -s -H 'Host: local' {extra} http://127.0.0.1{path}"

      def wait_ready(machine):
          machine.wait_for_unit("split-pro.service")
          machine.wait_until_succeeds("curl -sf http://127.0.0.1:3000/api/readyz", timeout=180)

      def assert_cron_runs(machine, psql):
          # Schedule a harmless job as the application role and wait until pg_cron has run it.
          machine.succeed(psql + " -c \"SELECT cron.schedule('vm-test', '1 seconds', 'SELECT 1')\"")
          machine.wait_until_succeeds(
              psql + " -tAc \"SELECT count(*) FROM cron.job_run_details d JOIN cron.job j USING (jobid)"
              + " WHERE j.jobname = 'vm-test' AND d.status = 'succeeded'\" | grep -qv '^0$'",
              timeout=60,
          )
          # The app calls cron.alter_job when it reconciles schedules at startup and when a
          # recurrence is edited.
          machine.succeed(
              psql + " -c \"SELECT cron.alter_job(jobid, schedule := '2 seconds') FROM cron.job WHERE jobname = 'vm-test'\""
          )
          machine.succeed(
              psql + " -tAc \"SELECT schedule FROM cron.job WHERE jobname = 'vm-test'\" | grep -qx '2 seconds'"
          )
          machine.succeed(psql + " -c \"SELECT cron.unschedule('vm-test')\"")

      with subtest("local database on a non-default port, generated secrets"):
          local.wait_for_unit("split-pro-db-setup.service")
          wait_ready(local)
          local.succeed("curl -sf -o /dev/null http://127.0.0.1:3000/auth/signin")
          local.succeed("test \"$(stat -c %a /var/lib/split-pro/nextauth-secret)\" = 600")
          local.succeed("test -s /var/lib/split-pro/vapid.json")
          before = local.succeed("cat /var/lib/split-pro/nextauth-secret")
          local.systemctl("restart split-pro.service")
          wait_ready(local)
          assert before == local.succeed("cat /var/lib/split-pro/nextauth-secret"), "secret changed on restart"
          local.succeed("sudo -u postgres psql -p 5433 -tAc 'SHOW shared_preload_libraries' | grep -q pg_cron")
          app_psql = "runuser -u split-pro -- psql -p 5433 -d split-pro"
          local.succeed(app_psql + " -c 'SELECT count(*) FROM _prisma_migrations'")
          assert_cron_runs(local, app_psql)

      with subtest("through nginx: pages, data routes, upload size, no preview/revalidation"):
          local.wait_for_unit("nginx.service")
          local.succeed(via_nginx("/api/readyz", "-f -o /dev/null"))
          local.succeed(via_nginx("/auth/signin", "-f -o /dev/null"))
          # A translated static (getStaticProps) page and its data route.
          local.succeed(via_nginx("/balances", "-f -o /dev/null"))
          local.succeed(via_nginx("/_next/data/$(cat ${buildIdFile})/en/balances.json", "-f -o /dev/null"))
          # Preview mode and on-demand revalidation must be unreachable: no value of the
          # x-prerender-revalidate header, including an empty one, may match the build's preview id.
          for value in ["", "disabled", "garbage"]:
              headers = local.succeed(via_nginx("/balances", f"-D - -o /dev/null -H 'x-prerender-revalidate: {value}'"))
              assert "REVALIDATED" not in headers.upper(), f"revalidation triggered with {value!r}: {headers}"
          # 2.5 MB is over the app's 1 MB file limit but under nginx's 3 MB request limit. The
          # request must reach the app, which answers 401 or 403 without a session, instead of
          # being stopped by nginx with 413.
          local.succeed("head -c 2500000 /dev/urandom > /tmp/upload.bin")
          code = local.succeed(via_nginx("/api/upload", "-o /dev/null -w '%{http_code}' -F file=@/tmp/upload.bin")).strip()
          assert code in ("401", "403"), f"upload under the nginx limit got {code}"
          local.succeed("head -c 4000000 /dev/urandom > /tmp/big.bin")
          code = local.succeed(via_nginx("/api/upload", "-o /dev/null -w '%{http_code}' -F file=@/tmp/big.bin")).strip()
          assert code == "413", f"upload over the nginx limit got {code}"

      with subtest("external database via environmentFiles DATABASE_URL, *File secrets"):
          db.wait_for_unit("postgresql.target")
          wait_ready(app)
          app.succeed("test ! -e /var/lib/split-pro/nextauth-secret")
          app.succeed("curl -sf http://127.0.0.1:3000/api/auth/providers | grep -q authentik")
          db.succeed("sudo -u postgres psql -d splitpro -tAc 'SELECT count(*) FROM _prisma_migrations' | grep -qv '^0$'")
          assert_cron_runs(db, "PGPASSWORD='${dbPassword}' psql -h 127.0.0.1 -U splitpro -d splitpro")
    '';
}
