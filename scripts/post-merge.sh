#!/bin/bash
set -e
npm install
# Use yes to auto-accept drizzle-kit prompts (stdin is /dev/null in post-merge)
yes '' 2>/dev/null | npx drizzle-kit push || true
