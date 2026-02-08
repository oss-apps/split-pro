# MIGRATING FROM V1

This guide covers the key differences and migration steps when upgrading from SplitPro v1 to v2.

## 1) Backup first

Always create a database backup before upgrading.

```bash
docker exec -t <postgres container name> pg_dumpall -c -U postgres > splitpro_backup.sql
```

## 2) PostgreSQL image upgrade (pg_cron required)

v2 requires PostgreSQL with the `pg_cron` extension for recurring transactions and cache management.

1. Use the `ossapps/postgres` image in your Docker setup.
2. Add the `pg_cron` startup flags (see `docker/prod/compose.yml`).
3. Make sure your tag matches your PostgreSQL major version and Debian variant. These can be checked by running:

```bash
docker exec -it <postgres container name> psql -U postgres -c "SELECT version();"
docker exec -it <postgres container name> cat /etc/os-release
```

Example snippet:

```yaml
services:
  postgres:
    image: ossapps/postgres:17.7-trixie
    command: >
      postgres
      -c shared_preload_libraries=pg_cron
      -c cron.database_name=${POSTGRES_DB:-splitpro}
      -c cron.timezone=UTC
```

We publish our own Postgres image with `pg_cron` included, but you can also build your own if needed. The setup is minimal as can be seen in our [Dockerfile](../docker/postgres/Dockerfile). Should you need a variant that is not available, you can create an issue about it and we will build it for you.

If you need a specific tag, check https://hub.docker.com/r/ossapps/postgres/tags.

## 3) Receipts storage moved to local volume

Receipts are now stored locally instead of S3/R2/Minio.

- Download your existing storage bucket contents.
- Mount the uploads directory as a local volume in your compose file.
- The migration script converts files to `webp` and generates thumbnails.

See [docker/prod/compose.yml](../docker/prod/compose.yml) for a working example.

## 4) Currency decimal fix (v1.5.4 - v1.5.8)

If you used currencies with decimal places other than 2 (e.g., JPY, KRW, KWD) in v1.5.4–v1.5.8, apply the fix before upgrading.

1. Download the migration script:
   https://github.com/oss-apps/split-pro/blob/889c1138397e8f4194be288fad7b9819920341dd/prisma/migrations/20251020174024_adjust_currency_decimals/migration.sql
2. Copy it next to your compose file.
3. Execute:

```bash
cat migration.sql | docker exec -i splitpro-db psql -U postgres -d splitpro
```

Adjust container name, database user, and database name as needed.

## 5) Run the upgrade

Start the updated containers and let the app run migrations automatically.

If you were running alpha or a custom main build, you may need manual help due to squashed migrations. If you encounter any issues, please reach out in the related v2 discussions or open a new issue.

## Checklist

- Database backup completed.
- Postgres image updated to include `pg_cron`.
- `pg_cron` flags added to your compose file.
- Uploads volume mounted for local receipts.
- v1.5.4-1.5.8 currency fix applied if needed.
