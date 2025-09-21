export const QATO_CONFIG = {
    DB_SERVICE: {
        JAR_NAME: 'qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar'
    },
    KARATE: {
        JAR_VERSION: '1.5.1',
        OUTPUT_DIR: 'target/karate-reports'
    },
    MAX_ERROR_MESSAGE_LENGTH: 1000
};

/**
 * Build regex pattern for detecting errors in Karate output
 */
export function buildErrorRegex(): RegExp {
    const errorPatterns = [
        'ERROR',
        'Exception',
        'Failed',
        'Error:',
        'java\\.lang\\.',
        'java\\.sql\\.',
        'org\\.springframework\\.',
        'com\\.intuit\\.karate\\.'
    ];
    return new RegExp(errorPatterns.join('|'), 'i');
}

/**
 * Check if error lines contain database-related errors
 */
export function isDbError(errorLines: string[]): boolean {
    const dbErrorPatterns = [
        'java.sql.',
        'SQLException',
        'Connection',
        'Database',
        'MySQL',
        'JDBC'
    ];
    
    const allErrors = errorLines.join(' ');
    return dbErrorPatterns.some(pattern => 
        allErrors.toLowerCase().includes(pattern.toLowerCase())
    );
}