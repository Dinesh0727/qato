# Database Configuration Migration and Backward Compatibility

## Overview

This implementation provides comprehensive migration and backward compatibility support for database configurations in the QATO Visual Builder extension. The migration system handles the transition from legacy configuration formats to the new hierarchical configuration structure.

## Features Implemented

### 1. Legacy Configuration Migration

The system automatically detects and migrates legacy database configuration files:

- **Source Files Detected:**
  - `target/qato-db-config.json` (primary legacy format)
  - `qato-db-config.json` (alternative location)
  - `.qato/db-config.json` (hidden directory format)
  - `db-config.json` (root level format)

- **Migration Process:**
  1. Scans for legacy configuration files in order of preference
  2. Creates backup of original configuration with timestamp
  3. Migrates database configurations to new format
  4. Merges with existing global configuration if present
  5. Creates migration markers for tracking

### 2. Enhanced Backward Compatibility

- **Existing Configuration Support:** Preserves existing `global-config.json` files
- **Format Validation:** Checks if configurations are up-to-date
- **Incremental Migration:** Only migrates what needs to be migrated
- **Safe Migration:** Creates backups before making changes
- **Automatic Fixes:** Applies compatibility fixes for missing fields
- **Field Type Corrections:** Fixes data type inconsistencies (e.g., Redis database field)
- **Folder Configuration Support:** Updates folder-level configurations for compatibility

### 3. Default Configuration Generation

For new workspaces without any configuration:

- **Automatic Creation:** Generates default `global-config.json`
- **Complete Structure:** Includes all three database types (MySQL, Redis, ClickHouse)
- **Sensible Defaults:** Uses localhost and standard ports
- **Version Tracking:** Includes version information for future migrations
- **Unique IDs:** Generates timestamp-based unique identifiers

### 4. Migration Tracking and Logging

- **Migration Log:** Records all migration activities in `.qato/migration.log`
- **Migration Markers:** Creates specific markers for different migration types
- **History Tracking:** Maintains complete migration history
- **Status Checking:** Can verify if specific migrations have been performed

### 5. Migration Testing and Validation

- **Scenario Testing:** Tests migration scenarios with existing workspace configurations
- **Comprehensive Validation:** Validates configuration structure, version, and database settings
- **Automatic Issue Detection:** Identifies and reports configuration problems
- **Self-Healing:** Automatically fixes common configuration issues
- **Recommendation Engine:** Provides migration recommendations based on current state

### 6. Configuration Import/Export

- **Backup Creation:** Export configurations for backup purposes
- **Configuration Sharing:** Share configurations between workspaces
- **Safe Import:** Creates backups before importing configurations
- **Validation on Import:** Validates imported configurations and applies fixes if needed

## Configuration Structure

### Legacy Format (target/qato-db-config.json)
```json
{
  "databases": {
    "mysql": {
      "id": "test-mysql",
      "name": "Test MySQL",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "test_db",
      "username": "test_user",
      "password": "test_pass",
      "timeout": 30000
    },
    "redis": {
      "id": "test-redis",
      "name": "Test Redis",
      "type": "redis",
      "host": "localhost",
      "port": 6379,
      "timeout": 30000
    },
    "clickhouse": {
      "id": "test-clickhouse",
      "name": "Test ClickHouse",
      "type": "clickhouse",
      "host": "localhost",
      "port": 8123,
      "database": "test_db",
      "username": "test_user",
      "password": "test_pass",
      "timeout": 30000
    }
  },
  "timestamp": "2025-09-10T18:24:15.000Z"
}
```

### New Format (global-config.json)
```json
{
  "version": "1.0.0",
  "defaultSettings": {
    "timeout": 30000,
    "retryCount": 3
  },
  "databases": {
    "mysql": {
      "id": "migrated-mysql-1725984000000",
      "name": "Migrated MySQL",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "test_db",
      "username": "test_user",
      "password": "test_pass",
      "timeout": 30000,
      "maxConnections": 10,
      "ssl": false,
      "description": "Migrated from legacy mysql configuration"
    },
    "redis": {
      "id": "migrated-redis-1725984000000",
      "name": "Migrated Redis",
      "type": "redis",
      "host": "localhost",
      "port": 6379,
      "database": "0",
      "timeout": 30000,
      "maxConnections": 10,
      "ssl": false,
      "description": "Migrated from legacy redis configuration"
    },
    "clickhouse": {
      "id": "migrated-clickhouse-1725984000000",
      "name": "Migrated ClickHouse",
      "type": "clickhouse",
      "host": "localhost",
      "port": 8123,
      "database": "test_db",
      "username": "test_user",
      "password": "test_pass",
      "timeout": 30000,
      "maxConnections": 10,
      "ssl": false,
      "description": "Migrated from legacy clickhouse configuration"
    }
  }
}
```

## Migration Process Flow

1. **Initialization:** When workspace is initialized, migration is automatically triggered
2. **Detection:** System scans for legacy configuration files
3. **Backup:** Creates timestamped backups in `.qato/` directory
4. **Migration:** Converts legacy format to new hierarchical structure
5. **Validation:** Validates migrated configuration for correctness
6. **Logging:** Records migration activities and results
7. **Cleanup:** Optionally removes legacy files (currently disabled for safety)

## API Methods

### ConfigurationMigration Class

- `migrateWorkspaceConfiguration(rootUri)`: Main migration entry point
- `forceMigration(rootUri)`: Force re-migration (removes markers first)
- `checkMigrationStatus(rootUri, migrationType)`: Check if specific migration was performed
- `getMigrationHistory(rootUri)`: Get complete migration history
- `validateMigratedConfiguration(rootUri)`: Validate configuration after migration
- `testMigrationScenarios(rootUri)`: Test migration scenarios with existing configurations
- `exportConfiguration(rootUri)`: Export configuration for backup or sharing
- `importConfiguration(rootUri, data)`: Import configuration from exported data
- `ensureBackwardCompatibility(rootUri)`: Apply backward compatibility fixes
- `fixConfigurationIssues(rootUri, error)`: Automatically fix configuration issues

### WorkspaceManager Integration

- `migrateWorkspaceConfiguration(rootUri)`: Trigger migration
- `forceMigration(rootUri)`: Force migration
- `getMigrationHistory(rootUri)`: Get migration history
- `checkMigrationStatus(migrationType, rootUri)`: Check migration status
- `testMigrationScenarios(rootUri)`: Test migration scenarios
- `exportConfiguration(rootUri)`: Export configuration
- `importConfiguration(data, rootUri)`: Import configuration

## Message Types for UI Integration

- `performMigration`: Trigger migration from UI
- `getMigrationHistory`: Request migration history
- `migrationCompleted`: Migration completion notification
- `migrationHistoryResult`: Migration history response
- `testMigrationScenarios`: Test migration scenarios
- `migrationScenariosResult`: Migration scenarios test results
- `exportConfiguration`: Export configuration
- `configurationExported`: Configuration export result
- `importConfiguration`: Import configuration
- `configurationImported`: Configuration import result

## Error Handling

- **Graceful Degradation:** Migration failures don't prevent extension operation
- **Detailed Logging:** Comprehensive error logging for troubleshooting
- **Backup Safety:** Always creates backups before making changes
- **Validation:** Post-migration validation ensures configuration integrity
- **Recovery:** Ability to recover from failed migrations

## Testing

The migration functionality has been tested with:

- Legacy configuration files in various formats
- Existing global configurations
- New workspace scenarios
- Error conditions and edge cases
- Concurrent migration scenarios

## Usage

### Automatic Migration
Migration happens automatically when:
- Extension initializes workspace
- Legacy configuration files are detected
- No valid global configuration exists

### Manual Migration
Migration can be triggered manually via:
- Extension commands
- UI controls
- API calls from other components

### Force Migration
For troubleshooting or re-migration:
- Removes existing migration markers
- Re-runs complete migration process
- Useful for testing or recovery scenarios

## Files Created During Migration

- `global-config.json`: Main configuration file
- `.qato/migration.log`: Migration activity log
- `.qato/migration-*.json`: Migration markers
- `.qato/*.backup.*`: Configuration backups

## Backward Compatibility Guarantees

1. **Existing Configurations:** Never overwrites existing valid configurations
2. **Legacy Files:** Preserves original legacy files (doesn't delete)
3. **Incremental Updates:** Only updates what needs to be updated
4. **Version Tracking:** Maintains version information for future migrations
5. **Rollback Support:** Backup files allow manual rollback if needed

This implementation ensures smooth transition from legacy configurations while maintaining full backward compatibility and providing robust error handling and logging capabilities.