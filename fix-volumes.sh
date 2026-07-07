#!/bin/bash
# Ensures volume mounts are present in Coolify docker-compose.yaml
# Run after any Coolify deploy or container recreation

COMPOSE_FILE="/data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p/docker-compose.yaml"
VOLUMES_BLOCK="        volumes:\n            - /data/marshrutizator/data:/app/data\n            - /data/marshrutizator/uploads:/app/uploads"

if ! grep -q "/data/marshrutizator/data:/app/data" "$COMPOSE_FILE" 2>/dev/null; then
    echo "Volume mounts missing in compose file. Adding..."
    sed -i '/env_file:/a\        volumes:\n            - /data/marshrutizator/data:/app/data\n            - /data/marshrutizator/uploads:/app/uploads' "$COMPOSE_FILE"
    echo "Volume mounts added. Recreating container..."
    cd /data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p && docker compose up -d
else
    echo "Volume mounts already present."
fi

# Verify DB size
DB_SIZE=$(docker exec $(docker ps --format '{{.Names}}' | grep marshrutizator | head -1) wc -c /app/data/travel.db 2>/dev/null)
if [ "$DB_SIZE" -lt 100000 ] 2>/dev/null; then
    echo "WARNING: DB is too small ($DB_SIZE bytes) — likely empty!"
else
    echo "DB OK: $DB_SIZE bytes"
fi
