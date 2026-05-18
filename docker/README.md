# Docker Setup for Splitpro

This guide covers Docker setup for Splitpro. You can choose between a production Docker Compose setup or a standalone container.

## Prerequisites

Before you begin, ensure that you have the following installed:

- Docker
- Docker Compose

## Production Docker Compose Setup

This setup includes PostgreSQL and the Splitpro application.

1. Download the Docker Compose file from the Splitpro repository: [compose.yml](https://github.com/oss-apps/split-pro/blob/main/docker/prod/compose.yml)
2. Navigate to the directory containing the `compose.yml` file.
3. Create a `.env` file in the same directory. Copy the contents of `.env.example`.
4. Adjust the variables to your deployment (see [docs/CONFIGURATION.md](../docs/CONFIGURATION.md)).
5. Run the following command to start the containers:

```bash
docker-compose up -d
```

This will start the PostgreSQL database and the Splitpro application containers.

6. Access the Splitpro application by visiting `http://localhost:3000` in your web browser.

### Minimal .env example

```bash
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="strong-password"
POSTGRES_DB="splitpro"
DATABASE_URL="postgresql://postgres:strong-password@postgres:5432/splitpro"
NEXTAUTH_SECRET="<generated>" # you can use `openssl rand -base64 32` to generate a strong secret
NEXTAUTH_URL="http://localhost:3000"
# See https://developers.google.com/identity/protocols/oauth2
GOOGLE_CLIENT_ID="<client-id>"
GOOGLE_CLIENT_SECRET="<client-secret>"
```

## Other options

There are of course other ways to run Splitpro with Docker. The above is the recommended production setup, but you can run it in other ways provided you know what you are doing.

If you prefer a more minimal setup, you can run the Splitpro application in a standalone container and connect it to an external PostgreSQL database. In this case, you can pass the environment variables directly when running the container.

Just make sure you install `pg_cron` if you want to use recurring transactions and currency/bank cache cleaning.

### Kubernetes

Some community members have successfully deployed Splitpro on Kubernetes. You can check out their deployments:

- https://github.com/gravelfreeman/talos/blob/main/clusters/main/kubernetes/apps/splitpro/app/helm-release.yaml

## Success

You have now successfully set up Splitpro using Docker. If you encounter any issues or have further questions, please seek assistance from the community.

## Migrating instance

To migrate your instance it is sufficient to copy the `.env` file, your uploads volume directory, as well as to migrate your database.

For v1 to v2 upgrades, see [docs/MIGRATING_FROM_V1.md](../docs/MIGRATING_FROM_V1.md).

#### DB backup

```bash
docker exec -t <postgres container name> pg_dumpall -c -U postgres > splitpro_backup.sql
```

#### DB restore

```bash
cat splitpro_backup.sql | docker exec -i <postgres container name> psql -U postgres
```

Make sure to adjust the database name and user if you are not using the default `postgres` user or database. Also, the above restore command should be run on a clean database.

## Authentication

Splitpro uses NextAuth with email, OAuth, and OIDC providers. Configure at least one provider and ensure `NEXTAUTH_URL` matches the URL you will access in the browser.

See [docs/AUTHENTICATION.md](../docs/AUTHENTICATION.md) for details.

## Recurring transactions (pg_cron)

Recurring expenses require PostgreSQL with `pg_cron`. The example compose file already enables it. If you use another database image, you must enable the extension yourself.

See [docs/RECURRING_TRANSACTIONS.md](../docs/RECURRING_TRANSACTIONS.md).

## Receipt storage

Receipts are stored locally. Make sure the `uploads` volume is mounted so files persist across restarts (see `docker/prod/compose.yml`).
