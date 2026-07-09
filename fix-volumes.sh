#!/bin/bash
# Ensures volume mounts are present in Coolify docker-compose.yaml
COMPOSE_FILE="/data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p/docker-compose.yaml"

if ! grep -q "/data/marshrutizator/data:/app/data" "$COMPOSE_FILE" 2>/dev/null; then
    echo "Volume mounts missing! Fixing with python3..."
    python3 -c "
import re, sys
with open('$COMPOSE_FILE', 'r') as f:
    content = f.read()
if 'volumes:' in content and '/data/marshrutizator/data:/app/data' in content:
    print('Already fixed.')
    sys.exit(0)
# Insert volumes after 'env_file:\n            - .env'
old = '        env_file:\n            - .env\n'
new = '        env_file:\n            - .env\n        volumes:\n            - /data/marshrutizator/data:/app/data\n            - /data/marshrutizator/uploads:/app/uploads\n'
content = content.replace(old, new)
with open('$COMPOSE_FILE', 'w') as f:
    f.write(content)
print('Fixed!')
"
    cd /data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p && docker compose up -d 2>&1
    sleep 5
fi

# Find container by image name pattern
CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | grep marshrutizator-app | awk '{print $1}' | head -1)
if [ -z "$CONTAINER" ]; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep "cs34" | head -1)
fi

if [ -n "$CONTAINER" ]; then
    DB_SIZE=$(docker exec "$CONTAINER" wc -c /app/data/travel.db 2>/dev/null | tr -d ' ')
    if [ "$DB_SIZE" -lt 100000 ] 2>/dev/null; then
        echo "DB TOO SMALL ($DB_SIZE bytes)!"
    else
        echo "DB OK: $DB_SIZE bytes"
    fi
else
    echo "Container not found!"
fi
