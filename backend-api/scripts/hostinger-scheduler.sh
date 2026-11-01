#!/bin/sh

# Hostinger custom cron entry:
# /bin/sh /home/USERNAME/domains/DOMAIN/public_html/backend-api/scripts/hostinger-scheduler.sh
#
# Configure that entry to run every minute. Laravel will run the leaderboard
# snapshot at 23:55 and lead follow-up rollover at 23:59 Asia/Kolkata.

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.." || exit 1

/usr/bin/php artisan schedule:run
