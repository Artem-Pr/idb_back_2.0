#!/bin/bash

# Make sure to give it execute permission by running "chmod +x mongo-test.sh" before executing the script.

# Define color variables
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
PURPLE="\033[0;35m"
CYAN="\033[0;36m"
NC="\033[0m" # No Color

SUCCESS=$GREEN
ERROR=$RED
INFO=$PURPLE
MAIN=$CYA

# Function to apply color to a message
log() {
    local color=$1
    local message=$2
    echo -e "${color}IDB_run_script : ${message}${NC}"
}

log $INFO "Starting the mongo-test..."

# docker compose -f docker-compose-test.yaml up -d
# docker compose -f docker-compose-test.yaml up --build
docker compose -f docker-compose-test.yaml up