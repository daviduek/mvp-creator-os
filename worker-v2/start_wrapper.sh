#!/bin/bash
# Run model init first (idempotent), then delegate to the official start.sh.
set -e

/init_models.sh
exec /start.sh
