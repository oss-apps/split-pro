# Docker Setup for Splitpro

The following guide will walk you through setting up Splitpro using Docker. You can choose between a production setup using Docker Compose or a standalone container.

## Prerequisites

Before you begin, ensure that you have the following installed:

- Docker
- Docker Compose (if using the Docker Compose setup)

## Option 1: Production Docker Compose Setup

This setup includes PostgreSQL and the Splitpro application.

1. Download the Docker Compose file from the Splitpro repository: [compose.yml](https://github.com/oss-apps/split-pro/blob/main/docker/prod/compose.yml)
2. Navigate to the directory containing the `compose.yml` file.
3. Create a `.env` file in the same directory. Copy the contents of `.env.example`
4. Adjust the variables to your deployment
5. Run the following command to start the containers:

```
docker-compose --env-file ./.env up -d
```

This will start the PostgreSQL database and the Splitpro application containers.

6. Access the Splitpro application by visiting `http://localhost:3000` in your web browser.

## Option 2: Standalone Docker Container

If you prefer to host the Splitpro application on your container provider of choice, you can use the pre-built Docker image from DockerHub or GitHub's Package Registry.

1. Pull the Splitpro Docker image:

```
docker pull ossapps/splitpro
```

Or, if using GitHub's Package Registry:

```
docker pull ghcr.io/oss-apps/splitpro
```

2. Run the Docker container, providing the necessary environment variables for your database and SMTP host:

```
docker run -d \
  -p ${PORT:-3000}:${PORT:-3000} \
  -e PORT=${PORT:-3000} \
  -e DATABASE_URL=${DATABASE_URL:?err} \
  -e NEXTAUTH_URL=${NEXTAUTH_URL:?err} \
  -e NEXTAUTH_SECRET=${NEXTAUTH_SECRET:?err} \
  -e GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:?err} \
  -e GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:?err}
  ossapps/splitpro
```

Replace the placeholders with your actual database and aws details.

1. Access the Splitpro application by visiting the URL you provided in the `NEXTAUTH_URL` environment variable in your web browser.

## Success

You have now successfully set up Splitpro using Docker. If you encounter any issues or have further questions, please seek assistance from the community.

## Migrating instance

To migrate your instance it is sufficient to copy the `.env` file as well as to migrate your database.

#### DB backup

```bash
docker exec -t <postgres container name> pg_dumpall -c -U postgres > splitpro_backup.sql
```

#### DB restore

```bash
cat splitpro_backup.sql | docker exec -i <postgres container name> psql -U postgres
```
