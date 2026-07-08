#!/bin/bash
# Cron job: checks every 5 minutes if volume mounts are present
# If missing, fixes them and restarts the container
# Add to crontab: */5 * * * * /data/marshrutizator/watch-volumes.sh >> /var/log/marshrutizator-watch.log 2>&1

COMPOSE_FILE="/data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p/docker-compose.yaml"
LOG="/var/log/marshrutizator-watch.log"

# Check if volume mounts exist
if ! grep -q "/data/marshrutizator/data:/app/data" "$COMPOSE_FILE" 2>/dev/null; then
    echo "$(date): Volume mounts MISSING — fixing..." >> "$LOG"
    python3 -c "
import re
with open('$COMPOSE_FILE', 'r') as f:
    content = f.read()
old = '        env_file:\n            - .env\n'
new = '        env_file:\n            - .env\n        volumes:\n            - /data/marshrutizator/data:/app/data\n            - /data/marshrutizator/uploads:/app/uploads\n'
content = content.replace(old, new)
with open('$COMPOSE_FILE', 'w') as f:
    f.write(content)
print('Fixed!')
" 2>> "$LOG"
    cd /data/coolify/applications/cs34zdvfw2du5wyqd0s5vx2p && docker compose up -d 2>> "$LOG"
    echo "$(date): Container restarted with volumes" >> "$LOG"
fi

# Check DB size
CONTAINER=$(docker ps --format '{{.Names}}' | grep "cs34" | head -1)
if [ -n "$CONTAINER" ]; then
    DB_SIZE=$(docker exec "$CONTAINER" wc -c /app/data/travel.db 2>/dev/null | tr -d ' ')
    if [ "$DB_SIZE" -lt 100000 ] 2>/dev/null; then
        echo "$(date): DB TOO SMALL ($DB_SIZE bytes) — volumes may be missing!" >> "$LOG"
    fi
fi
