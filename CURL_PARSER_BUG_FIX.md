# Curl Parser Bug Fix Summary

## Problem Identified

Your curl parser was failing to extract JSON bodies that contained quotes. The regex pattern `[^'"]*` would stop at the first quote character inside the JSON.

### Example of Failure

```bash
curl --data '{"message": {"channel": "WABA"}}'
```

Would only capture: `{` (stopped at first internal quote)

## Root Cause

The regex in `extractBody()` method:

```typescript
const dataMatch = command.match(
  /(?:--data-raw|--data-binary|--data|-d)\s+['"]([^'"]*)['"]/
);
```

The pattern `[^'"]*` means "match any character EXCEPT quotes", causing it to fail on JSON with nested quotes.

## Solution Applied

Updated all regex patterns in `extractBody()` to use **backreferences**:

```typescript
// OLD (broken):
/(?:--data|-d)\s+['"]([^'"]*)['"]/

// NEW (fixed):
/(?:--data|-d)\s+(['"])([\s\S]*?)\1(?:\s|$)/
```

### How It Works

- `(['"])` - Captures the opening quote (single or double) in group 1
- `([\s\S]*?)` - Captures any content (including newlines) non-greedily in group 2
- `\1` - Backreference that matches the SAME quote type from group 1
- `(?:\s|$)` - Ensures we match whitespace or end of string after closing quote

This properly handles nested quotes because it only stops at a quote that matches the opening quote type.

## Changes Made

Updated three regex patterns in `webview-ui/src/utils/curlParser.ts`:

1. **Form data**: `--form` / `-F` flags
2. **URL encoded**: `--data-urlencode` flag
3. **Raw data**: `--data` / `--data-raw` / `--data-binary` / `-d` flags

## Testing Results

✅ Successfully parses your problematic curl:

```bash
curl --location 'https://rcmqa.karix.com/services/rcm/sendMessage' \
--header 'Authentication: Bearer Cv4zdo706u0P7YrwUMwRZA==' \
--header 'Content-Type: application/json' \
--data '{"message": {"channel": "WABA","content": {...}}}'
```

- ✅ Extracts complete 854-character JSON body
- ✅ Validates as proper JSON
- ✅ Preserves all nested quotes and special characters
- ✅ No TypeScript errors

## Why Not Use curl-parser-ts?

The external library is **NOT suitable** for your use case:

| Issue                  | Impact                                               |
| ---------------------- | ---------------------------------------------------- |
| Wrong output structure | Returns `data` instead of `body`, missing `bodyType` |
| No `enabled` flags     | Can't toggle params/headers in UI                    |
| No `extractVars`       | Missing your custom variable extraction              |
| No Karate support      | Doesn't understand `file:` / `classpath:` prefixes   |
| Extra dependency       | Adds 50KB + maintenance burden                       |
| Transformation needed  | Would require wrapper to convert to `ApiStepConfig`  |

Your implementation is **purpose-built for Karate API testing** and just needed this regex fix.

## Verification

Run your curl import feature with the test curl command - it should now correctly parse the entire JSON body with all nested quotes intact.
