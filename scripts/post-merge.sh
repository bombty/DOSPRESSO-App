#!/bin/bash
set -e
npm install
timeout 45 bash -c 'yes "" 2>/dev/null | npx drizzle-kit push' || true
