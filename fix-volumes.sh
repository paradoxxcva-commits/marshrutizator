#!/bin/bash
# Ensures volume mounts are present in Coolify docker-compose.yaml
COMPOSE_FILE="/data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p/docker-compose.yaml"

if ! grep -q "/data/marshrutizator/data:/app/data" "$COMPOSE_FILE" 2>/dev/null; then
    echo "Volume mounts missing! Fixing..."
    # Replace the broken env_file line and add volumes properly
    python3 -c "
import re
with open('$COMPOSE_FILE', 'r') as f:
    content = f.read()
# Find env_file line and add volumes after .env line
content = re.sub(
    r'(        env_file:\n            - \.env\n)',
    r'\1        volumes:\n            - /data/marshrutizator/data:/app/data\n            - /data/marshrutizator/uploads:/app/uploads\n',
    content
)
with open('$COMPOSE_FILE', 'w') as f:
    f.write(content)
print('Fixed!')
"
    cd /data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p && docker compose up -d 2>&1
    sleep 5
fi

CONTAINER=$(docker ps --format '{{.Names}}' | grep marshrutizator | head -1)
if [ -n "$CONTAINER" ]; then
    DB_SIZE=$(docker exec "$CONTAINER" wc -c /app/data/travel.db 2>/dev/null | tr -d ' ')
    echo "DB: $DB_SIZE bytes"
else
    echo "Container not found!"
fi
