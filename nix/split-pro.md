# SplitPro {#module-services-split-pro}

[SplitPro](https://github.com/oss-apps/split-pro) is a self-hosted alternative to Splitwise
for sharing expenses.

## Basic usage {#module-services-split-pro-basic-usage}

A minimal setup with a local PostgreSQL database, email sign-in and an nginx proxy:

```nix
{
  services.split-pro = {
    enable = true;
    url = "https://split.example.com";
    email = {
      from = "splitpro@example.com";
      server = {
        host = "smtp.example.com";
        port = 587;
        user = "splitpro";
        passwordFile = "/run/secrets/split-pro/smtp-password";
      };
    };
    nginx = {
      enable = true;
      hostName = "split.example.com";
    };
  };

  services.nginx.virtualHosts."split.example.com" = {
    enableACME = true;
    forceSSL = true;
  };
}
```

Set the listening address with `port` and `host`. These options configure the app, the managed
nginx proxy and `openFirewall` together. Don't set `PORT` or `HOSTNAME` in `environment` or
`environmentFiles`: nginx and the firewall would keep using the values from the options.

SplitPro refuses to start without at least one sign-in provider: email (`email.server.host`)
or one of the `auth.*` OAuth providers.

`NEXTAUTH_SECRET` is generated on first start into `/var/lib/split-pro/nextauth-secret` unless
you provide `auth.secretFile` or disable `autoGenerateSecrets`. Web push keys are generated the
same way when `pushNotifications.email` is set.

## Secrets {#module-services-split-pro-secrets}

Every secret option `foo` has a matching `fooFile` option. Prefer the file option, because
plain values end up world-readable in the Nix store. The files are passed to the service as
systemd credentials, so they can be owned by root, as files from sops-nix or agenix usually are.

For anything else, `environmentFiles` takes files with `KEY=value` lines, such as a sops
template. Values from these files override the typed options, and the `*File` options override
these files in turn.

## Database {#module-services-split-pro-database}

By default (`database.createLocally = true`) the module creates a database and role named
`split-pro` on the local PostgreSQL and connects over the Unix socket in `/run/postgresql` with
peer authentication. The connection uses the port from `services.postgresql.settings.port`. If
you moved the socket with `unix_socket_directories`, set `database.socketDir` to match.
It also configures [pg_cron](https://github.com/citusdata/pg_cron), which recurring expenses
need (`database.configurePgCron`).

### External database {#module-services-split-pro-database-external}

To use any other server, put a complete connection URL in an environment file. TLS and other
connection parameters then all go in the same place:

```nix
{
  services.split-pro = {
    database.createLocally = false;
    # Contains DATABASE_URL=postgresql://splitpro:<url-encoded password>@db.example.com:5432/splitpro
    environmentFiles = [ config.sops.templates."split-pro.env".path ];
  };
}
```

Percent-encode special characters in the user name and password (`@` is `%40`, `/` is `%2F`).

The server must load pg_cron, point `cron.database_name` at the SplitPro database and run jobs
in background workers. These are the settings the module applies to a local server:

```ini
shared_preload_libraries = 'pg_cron'
cron.database_name = 'splitpro'
cron.timezone = 'UTC'               # the time zone recurrence.time is interpreted in
cron.use_background_workers = on
cron.max_running_jobs = 8
max_worker_processes = 24           # must exceed cron.max_running_jobs plus other workers
```

Without `cron.use_background_workers`, pg_cron opens a new connection to the server for every
job, which fails on servers that require a password. SplitPro then still starts and schedules
recurring expenses, but they are never created. If you keep the default, pg_cron connects to
`cron.host` (TCP `localhost` by default) as the SplitPro role, and that connection must work
without a password. Either add a `pg_hba.conf` `host` rule that trusts that role on loopback, or
add a `.pgpass` entry for the system user that PostgreSQL runs as.

Changing these settings requires a server restart. Then, as a superuser, run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO splitpro;
GRANT EXECUTE ON FUNCTION cron.alter_job(bigint, text, text, text, text, boolean) TO splitpro;
GRANT UPDATE (schedule), REFERENCES (jobid) ON cron.job TO splitpro;
```

pg_cron already lets every role read `cron.job` and `cron.job_run_details`. The app also changes
schedules with `cron.alter_job`. pg_cron revokes that function from public, but the function
still only changes jobs that belong to the caller. Finally, the app's migrations rewrite
`cron.job.schedule` and add a foreign key to `cron.job(jobid)`.

If that server is this machine's `services.postgresql`, but this module doesn't create the
database, set `database.configurePgCron = true` and the module does this setup for you. Remove any `pg_cron` entry
you already have in `services.postgresql.settings.shared_preload_libraries`.

Recurring expenses run at `recurrence.time` in `recurrence.timeZone` (pg_cron's `cron.timezone`).

## Migrating from the Docker image {#module-services-split-pro-migrating}

You can keep the existing database: set `DATABASE_URL` to its connection URL, as described
above. SplitPro applies any pending schema migrations on start.

The database refers to uploaded receipts and avatars by file name, so the files have to move
too. The Docker image
keeps them in `/app/uploads`, usually a volume or bind mount such as
`/var/lib/splitpro/uploads`. With the container stopped:

```console
# systemctl stop split-pro
# mkdir -p /var/lib/split-pro
# cp -a /var/lib/splitpro/uploads /var/lib/split-pro/uploads
# chown -R split-pro:split-pro /var/lib/split-pro/uploads
# systemctl start split-pro
```

Or keep the old location with `uploads.directory = "/var/lib/splitpro/uploads";` and only
change the ownership. The container usually ran as a different UID.
