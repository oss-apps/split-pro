#!/bin/sh

set -x

echo "Deploying prisma migrations"

pnpx prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting web server"

node server.js

