FROM postgres:16

# Install pg_cron (from PGDG packages)
RUN apt-get update && apt-get install -y \
  postgresql-16-cron \
  && rm -rf /var/lib/apt/lists/*