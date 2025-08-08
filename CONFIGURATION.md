# QATO Extension Configuration

This document explains how to configure the QATO extension without making code changes.

## Configuration File

All configurable settings are located in `src/config.ts`. You can modify this file to:

- Add new error detection patterns
- Change timeout values
- Update file paths
- Modify UI settings

## Error Detection Patterns

### Adding New Error Patterns

To add new error patterns that should be detected and displayed in the UI, edit the `ERROR_PATTERNS` array in `src/config.ts`:

```typescript
ERROR_PATTERNS: [
  'js failed:',
  'PolyglotException',
  'org\\.graalvm\\.polyglot\\.PolyglotException',
  'No results for path',
  'feature: .+\\.feature',
  'scenarios:',
  'failed:',
  'error:',
  'Exception:',
  'at .+\\(.+\\)',
  'DB Error:',
  'Missing columns:',
  'Code: 47\\. DB::Exception',
  // Add your new pattern here
  'Your New Error Pattern',
],
```

### Adding DB-Specific Error Patterns

To add patterns that should be categorized as database errors, edit the `DB_ERROR_PATTERNS` array:

```typescript
DB_ERROR_PATTERNS: [
  'DB Error:',
  'Missing columns:',
  'Code: 47\\. DB::Exception',
  // Add your new DB error pattern here
  'Database connection failed:',
],
```

## Configuration Options

### Error Message Settings

```typescript
// Maximum length for error messages in the UI
MAX_ERROR_MESSAGE_LENGTH: 2000,
```

### Karate Settings

```typescript
KARATE: {
  OUTPUT_DIR: 'target',
  JAR_VERSION: '1.5.1',
},
```

### DB Access Service Settings

```typescript
DB_SERVICE: {
  JAR_NAME: 'qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar',
  STARTUP_TIMEOUT: 30000, // 30 seconds
},
```

### UI Settings

```typescript
UI: {
  DEFAULT_DELAY_MS: 500,
  MAX_EXECUTION_TIME: 300000, // 5 minutes
},
```

## Examples

### Example 1: Adding a New Error Pattern

If you encounter a new type of error like `Connection timeout`, add it to the patterns:

```typescript
ERROR_PATTERNS: [
  // ... existing patterns ...
  'Connection timeout',
  'Network unreachable',
],
```

### Example 2: Adding a New DB Error Pattern

If you encounter a new database error like `Table not found`, add it to DB patterns:

```typescript
DB_ERROR_PATTERNS: [
  // ... existing patterns ...
  'Table not found',
  'Permission denied',
],
```

### Example 3: Changing Timeout Settings

If your database queries take longer, increase the timeout:

```typescript
DB_SERVICE: {
  JAR_NAME: 'qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar',
  STARTUP_TIMEOUT: 60000, // 60 seconds
},
```

## Important Notes

1. **Regex Patterns**: When adding new patterns, remember to escape special regex characters with double backslashes (`\\`).
2. **Case Insensitive**: All patterns are matched case-insensitively.
3. **Restart Required**: After modifying the configuration file, you need to restart the extension for changes to take effect.
4. **Backup**: Always backup your configuration before making changes.

## Troubleshooting

### Pattern Not Detected

If your new error pattern is not being detected:

1. Check that the pattern is correctly escaped for regex
2. Verify the pattern appears exactly as it does in the logs
3. Restart the extension after making changes
4. Check the extension console for any regex compilation errors

### Too Many False Positives

If the error detection is catching too many false positives:

1. Make your patterns more specific
2. Use word boundaries (`\\b`) around patterns
3. Consider moving general patterns to more specific categories 