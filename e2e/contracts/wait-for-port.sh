#!/bin/bash

# Usage: ./wait-for-port.sh <port_number> <timeout_in_seconds>
PORT=$1
TIMEOUT=$2
START_TIME=$(date +%s)

if [ -z "$PORT" ]; then
    echo "Error: Port number is required."
    exit 1
fi

if [ -z "$TIMEOUT" ]; then
    TIMEOUT=60 # Default timeout in seconds
fi

echo "Waiting for port $PORT to become available..."

while true; do
    # Check if the port is available
    nc -z localhost "$PORT" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Port $PORT is now available!"
        exit 0
    fi

    # Check if we've exceeded the timeout
    CURRENT_TIME=$(date +%s)
    ELAPSED_TIME=$((CURRENT_TIME - START_TIME))
    if [ "$ELAPSED_TIME" -ge "$TIMEOUT" ]; then
        echo "Timeout: Port $PORT did not become available within $TIMEOUT seconds."
        exit 1
    fi

    # Wait for a short period before checking again
    sleep 1
done