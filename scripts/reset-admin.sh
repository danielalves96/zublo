#!/bin/bash
# Zublo — Reset PocketBase superadmin password
# Usage: cd apps/backend && ./reset-admin.sh

PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%' < /dev/urandom | head -c 12)

./pocketbase superuser upsert admin@zublo.local "$PASS"

echo ""
echo "✓ Superadmin password reset!"
echo "  Email:    admin@zublo.local"
echo "  Password: $PASS"
