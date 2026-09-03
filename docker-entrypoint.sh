#!/bin/sh
set -e

# Aplica migrations pendentes (idempotente: não faz nada se já estiverem
# todas aplicadas). Usa "migrate deploy", não "migrate dev" — não gera
# migration nova nem pede confirmação, seguro para rodar a cada deploy.
echo "Aplicando migrations do Prisma..."
node_modules/.bin/prisma migrate deploy

exec "$@"
