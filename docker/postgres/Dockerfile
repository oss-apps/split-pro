ARG POSTGRES_MAJOR=16
ARG POSTGRES_MINOR=10
ARG POSTGRES_BASE=trixie

FROM postgres:${POSTGRES_MAJOR}.${POSTGRES_MINOR}-${POSTGRES_BASE}

ARG POSTGRES_MAJOR

# Install pg_cron (from PGDG packages)
RUN apt-get update && apt-get install -y \
    postgresql-${POSTGRES_MAJOR}-cron \
    && rm -rf /var/lib/apt/lists/*