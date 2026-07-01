#!/bin/bash
# Безопасный редеплой — НЕ удаляет data/uploads
set -e
cd /data/marshrutizator
echo "=== Stopping old container ==="
docker compose down
echo "=== Rebuilding image ==="
docker build -t marshrutizator-app .
echo "=== Starting new container ==="
docker compose up -d
echo "=== Waiting for health check ==="
sleep 10
curl -s https://marshrutizator.su/api/health && echo ""
echo "=== Done ==="
echo "Login: admin@marshrutizator.su / admin123"
