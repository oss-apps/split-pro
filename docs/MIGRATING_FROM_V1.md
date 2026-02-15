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

## 5) New balance calculation logic

In version 1, balances were a table in the database, updated by logic that used to have bugs in it (and potentially still had). What is more, groups were basically second class entities or an afterthough, when I picked up maintenance of the repo and some odd design decisions I could not work around anymore. The balances are now database views, so they are ALWAYS calculated based on existing expenses, so you can rest easy that if the expenses are correct, the balances are correct.

There might be some hiccups along the way, for example as explained in https://github.com/oss-apps/split-pro/issues/541, the group balances were all pooled together into the individual balances and upon initiating a settle up, the logic was as follows:

- **user A** settles balance with **user B**, derived from individual AND group expenses
- the `Balance` table row for these user is adjusted by the settlement amount
- now here is the shitty part. There was a backend check that if the `Balance` row was now **zero**, additiional updates were performed, setting each `GroupBalance` table rows between these users to **zero**
- this has introduced numerous nasty bugs, especially hard to debug given the decentralized nature of SplitPro usage and me not having access to user data
- a decision was reached to both:
  - get rid of the error prone `*Balance` tables and dynamically calculate balances based on existing expenses
  - treat groups like first class citizens, not as some sort of underclass, so individual expenses are now treated as a `null` group
- this allowed for proper operation of simplify, tracable total balances and much greater confidence in the calculated amounts. While having a view is maybe less performant, I believe that when it comes to handling people's money, correctness comes first
- however, there are some paper cuts, like in the linked issue, where settleups cleared out both Total Balances AND Group Balances.

With the new version, the total balances are okay, because they include ALL the expenses, settleups included. The group balances, especially with simplify mightnot be, because the settleups were outside of groups.

As such, you may find that some balances are inflated after the migration! To remedy this, settleups that were made outside of groups need to be adjusted. **Your safest bet is to settle all balances before the migration.**

Another option would be to add post migration settlements or if you want a perfect history, you need to go over all the settleups and replace them with group assigned ones.

## 6) Run the upgrade

Start the updated containers and let the app run migrations automatically. Read the logs and inspect if everything went okay (if the receipt images were converted to webp and if settleups look okayish).

If you were running alpha or a custom main build, you may need manual help due to squashed migrations. If you encounter any issues, please reach out in the related v2 discussions or open a new issue.

## Checklist

- Database backup completed.
- Postgres image updated to include `pg_cron`.
- `pg_cron` flags added to your compose file.
- Uploads volume mounted for local receipts.
- v1.5.4-1.5.8 currency fix applied if needed.
