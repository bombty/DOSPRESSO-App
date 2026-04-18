---
name: dospresso-radix-safety
description: Critical safety rules for managing Radix UI packages in DOSPRESSO. Prevents the recurring dispatcher.useState crash caused by nested package versions. Use BEFORE installing, updating, or removing any npm package.
---

# DOSPRESSO Radix UI Package Safety

## THE PROBLEM

DOSPRESSO has crashed 3 times from Radix UI package version conflicts. When npm installs a Radix package with incompatible internal dependencies, it creates nested node_modules. This causes React to see two different React instances, resulting in:

```
[plugin:runtime-error-plugin] null is not an object (evaluating 'dispatcher.useState')
```

This crash is TOTAL — no page loads, no login possible, all 245 users affected.

## RULES (MANDATORY)

### Rule 1: NEVER use caret (^) versions for Radix packages

```json
// WRONG:
"@radix-ui/react-dialog": "^1.1.4"

// CORRECT:
"@radix-ui/react-dialog": "1.1.4"
```

### Rule 2: Check for nested packages after EVERY npm install

```bash
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null
```

**If this returns ANY results → the install is BROKEN. Do not proceed.**

### Rule 3: Use overrides in package.json

DOSPRESSO has these overrides pinned:
```json
"overrides": {
  "@radix-ui/react-use-controllable-state": "1.1.1",
  "@radix-ui/react-primitive": "2.0.3",
  "@radix-ui/react-presence": "1.1.3",
  "@radix-ui/react-compose-refs": "1.1.2",
  "@radix-ui/react-context": "1.1.2",
  "@radix-ui/react-id": "1.1.1",
  "@radix-ui/react-use-callback-ref": "1.1.1",
  "@radix-ui/react-use-layout-effect": "1.1.1"
}
```

NEVER remove these overrides.

### Rule 4: Before installing ANY new Radix package

1. Check what version of shared dependencies the new package needs
2. Compare with currently installed versions (from overrides above)
3. If incompatible → find an older version that IS compatible
4. Install with `--save-exact` flag

```bash
# Example: before installing @radix-ui/react-new-component
npm info @radix-ui/react-new-component@latest dependencies
# Check if react-primitive, react-presence etc. match our pinned versions
```

### Rule 5: After ANY npm install (even non-Radix packages)

```bash
# Run the build safety check
bash scripts/check-build-safety.sh

# If it fails, DO NOT commit. Fix first.
```

## RECOVERY PROCEDURE (If crash happens)

```bash
# 1. Find nested packages
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null

# 2. Delete them
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null

# 3. If still broken, nuclear option:
rm -rf node_modules package-lock.json
npm install

# 4. Verify clean
find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null | wc -l
# Must be 0

# 5. Clear Vite cache
rm -rf node_modules/.vite

# 6. Bump Service Worker version
# In client/public/service-worker.js, increment CACHE_VERSION

# 7. Restart server
npm run dev
```

## CURRENTLY PINNED RADIX PACKAGES

All @radix-ui packages in package.json must have exact versions (no ^):
- react-accordion: 1.2.4
- react-alert-dialog: 1.1.5
- react-checkbox: 1.1.4
- react-collapsible: 1.1.4
- react-dialog: 1.1.5
- react-dropdown-menu: 2.1.5
- react-label: 2.1.2
- react-popover: 1.1.5
- react-progress: 1.1.2
- react-radio-group: 1.2.4
- react-scroll-area: 1.2.3
- react-select: 2.1.5
- react-separator: 1.1.2
- react-slot: 1.1.2
- react-switch: 1.1.4
- react-tabs: 1.1.4
- react-toast: 1.2.5
- react-tooltip: 1.1.8

**If updating any of these, follow Rule 4 strictly.**
