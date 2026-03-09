#!/bin/bash
ERRORS=0

echo "=== Build Safety Check ==="
echo ""

echo "1. Nested Radix packages check..."
NESTED=$(find node_modules/@radix-ui -path "*/node_modules/*" -name "package.json" 2>/dev/null | wc -l)
if [ "$NESTED" -gt "0" ]; then
  echo "  NESTED Radix packages found — will cause React crash:"
  find node_modules/@radix-ui -path "*/node_modules/*" -name "package.json" | head -10
  ERRORS=$((ERRORS+1))
else
  echo "  No nested Radix packages"
fi

echo ""
echo "2. Radix version pinning check..."
UNPINNED=$(grep '@radix-ui' package.json | grep '"\^' | wc -l)
if [ "$UNPINNED" -gt "0" ]; then
  echo "  UNPINNED Radix packages with ^ caret:"
  grep '@radix-ui' package.json | grep '"\^'
  ERRORS=$((ERRORS+1))
else
  echo "  All Radix packages pinned to exact versions"
fi

echo ""
echo "3. Vite build check..."
BUILD_OUTPUT=$(npx vite build 2>&1)
BUILD_EXIT=$?
if [ "$BUILD_EXIT" -ne "0" ]; then
  echo "  Vite build FAILED:"
  echo "$BUILD_OUTPUT" | grep -i "error\|fail\|cannot" | head -10
  ERRORS=$((ERRORS+1))
else
  echo "  Vite build successful"
fi

echo ""
if [ "$ERRORS" -gt "0" ]; then
  echo "FAILED: $ERRORS issue(s) found. Fix before deploying."
  exit 1
fi
echo "PASSED: All safety checks OK"
