// Configuration file for QATO extension
// This file can be modified to add new error patterns or change settings without code changes

export const QATO_CONFIG = {
  // Error detection patterns - add new patterns here as needed
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
    // Add more patterns here as needed
  ],

  // DB-specific error patterns
  DB_ERROR_PATTERNS: [
    'DB Error:',
    'Missing columns:',
    'Code: 47\\. DB::Exception',
    // Add more DB-specific patterns here
  ],

  // Maximum length for error messages in the UI
  MAX_ERROR_MESSAGE_LENGTH: 2000,

  // Karate settings
  KARATE: {
    OUTPUT_DIR: 'target',
    JAR_VERSION: '1.5.1',
  },

  // DB Access Service settings
  DB_SERVICE: {
    JAR_NAME: 'qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar',
    STARTUP_TIMEOUT: 30000, // 30 seconds
  },

  // UI settings
  UI: {
    DEFAULT_DELAY_MS: 500,
    MAX_EXECUTION_TIME: 300000, // 5 minutes
  }
};

// Helper function to build the error regex from patterns
export function buildErrorRegex(): RegExp {
  const patterns = QATO_CONFIG.ERROR_PATTERNS.map(pattern => `(${pattern})`).join('|');
  return new RegExp(patterns, 'i');
}

// Helper function to check if an error is DB-specific
export function isDbError(errorLines: string[]): boolean {
  return QATO_CONFIG.DB_ERROR_PATTERNS.some(pattern => 
    errorLines.some(line => new RegExp(pattern, 'i').test(line))
  );
} 