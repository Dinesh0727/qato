import * as vscode from 'vscode';
import * as path from 'path';
import { GlobalConfig, DatabaseConfig, DatabaseConfigSet, FileSystemResult } from './workspaceTypes';

/**
 * Configuration migration utility for handling backward compatibility
 * and migrating existing configurations to the new format
 */
/**
 * Legacy configuration format (pre-database-config-management)
 */
interface LegacyGlobalConfig {
  version?: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  // Legacy format might not have databases field
  databases?: any;
}

/**
 * Legacy database configuration format (from target/qato-db-config.json)
 */
interface LegacyDatabaseConfig {
  databases: {
    mysql?: any;
    redis?: any;
    clickhouse?: any;
  };
  timestamp?: string;
}

export class ConfigurationMigration {

  /**
   * Migrate existing workspace configuration to new format
   */
  async migrateWorkspaceConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      console.log('[ConfigurationMigration] Starting workspace configuration migration...');
      
      let migrationPerformed = false;
      
      // Step 1: Check for legacy database configuration files and migrate first
      const dbMigrationResult = await this.migrateLegacyDatabaseConfiguration(rootUri);
      if (dbMigrationResult.success && dbMigrationResult.data) {
        migrationPerformed = true;
        console.log('[ConfigurationMigration] Legacy database configuration migrated successfully');
      }
      
      // Step 2: Check for legacy global-config.json and migrate if needed
      const globalMigrationResult = await this.migrateGlobalConfiguration(rootUri);
      if (globalMigrationResult.success && globalMigrationResult.data) {
        migrationPerformed = true;
        console.log('[ConfigurationMigration] Global configuration migrated successfully');
      }
      
      // Step 3: Ensure default configuration exists for new workspaces
      const defaultConfigResult = await this.ensureDefaultConfiguration(rootUri);
      if (defaultConfigResult.success && defaultConfigResult.data) {
        migrationPerformed = true;
        console.log('[ConfigurationMigration] Default configuration created for new workspace');
      }
      
      // Step 4: Perform backward compatibility checks and fixes
      const compatibilityResult = await this.ensureBackwardCompatibility(rootUri);
      if (compatibilityResult.success && compatibilityResult.data) {
        migrationPerformed = true;
        console.log('[ConfigurationMigration] Backward compatibility fixes applied');
      }
      
      // Step 5: Perform post-migration validation and cleanup
      if (migrationPerformed) {
        const validationResult = await this.validateMigratedConfiguration(rootUri);
        if (!validationResult.success) {
          console.warn('[ConfigurationMigration] Post-migration validation failed:', validationResult.error);
          // Try to fix validation issues
          const fixResult = await this.fixConfigurationIssues(rootUri, validationResult.error || '');
          if (fixResult.success) {
            console.log('[ConfigurationMigration] Configuration issues fixed automatically');
          }
        } else {
          console.log('[ConfigurationMigration] Post-migration validation successful');
        }
        
        // Create migration log
        await this.createMigrationLog(rootUri, migrationPerformed);
      }
      
      console.log(`[ConfigurationMigration] Migration completed. Changes made: ${migrationPerformed}`);
      return { success: true, data: migrationPerformed };
      
    } catch (error: any) {
      console.error('[ConfigurationMigration] Migration failed:', error);
      return {
        success: false,
        error: `Configuration migration failed: ${error.message}`
      };
    }
  }

  /**
   * Migrate existing global-config.json to new format
   */
  private async migrateGlobalConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      
      // Check if global-config.json exists
      let existingConfig: any;
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        existingConfig = JSON.parse(configData.toString());
      } catch {
        // File doesn't exist, no migration needed
        return { success: true, data: false };
      }
      
      // Check if migration is needed
      if (this.isConfigurationUpToDate(existingConfig)) {
        return { success: true, data: false };
      }
      
      console.log('[ConfigurationMigration] Migrating global configuration...');
      
      // Create backup of existing configuration
      await this.createConfigurationBackup(rootUri, 'global-config.json', existingConfig);
      
      // Migrate to new format
      const migratedConfig = this.migrateGlobalConfigFormat(existingConfig);
      
      // Write migrated configuration
      const configContent = JSON.stringify(migratedConfig, null, 2);
      await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
      
      return { success: true, data: true };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to migrate global configuration: ${error.message}`
      };
    }
  }

  /**
   * Migrate legacy database configuration files (like target/qato-db-config.json)
   */
  private async migrateLegacyDatabaseConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      // Look for legacy database configuration files in order of preference
      const legacyPaths = [
        'target/qato-db-config.json',
        'qato-db-config.json',
        '.qato/db-config.json',
        'db-config.json'
      ];
      
      let legacyConfig: any = null;
      let legacyPath: string | null = null;
      
      for (const legacyPathStr of legacyPaths) {
        try {
          const legacyConfigPath = vscode.Uri.joinPath(rootUri, legacyPathStr);
          const configData = await vscode.workspace.fs.readFile(legacyConfigPath);
          legacyConfig = JSON.parse(configData.toString());
          legacyPath = legacyPathStr;
          console.log(`[ConfigurationMigration] Found legacy database configuration at: ${legacyPath}`);
          break;
        } catch {
          // File doesn't exist, try next path
          continue;
        }
      }
      
      if (!legacyConfig || !legacyPath) {
        console.log('[ConfigurationMigration] No legacy database configuration files found');
        return { success: true, data: false };
      }
      
      // Validate legacy configuration structure
      if (!legacyConfig.databases || typeof legacyConfig.databases !== 'object') {
        console.warn(`[ConfigurationMigration] Invalid legacy configuration structure in ${legacyPath}`);
        return { success: true, data: false };
      }
      
      // Create backup before migration
      await this.createConfigurationBackup(rootUri, path.basename(legacyPath), legacyConfig);
      
      // Migrate legacy database configuration to global-config.json
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      let globalConfig: GlobalConfig;
      
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        globalConfig = JSON.parse(configData.toString());
        console.log('[ConfigurationMigration] Merging with existing global configuration');
      } catch {
        // Create new global config
        globalConfig = this.createDefaultGlobalConfig();
        console.log('[ConfigurationMigration] Creating new global configuration');
      }
      
      // Migrate database configurations
      const migratedDatabases = this.migrateLegacyDatabaseConfigFormat(legacyConfig);
      
      // Merge with existing databases, preserving any existing configurations
      globalConfig.databases = { ...globalConfig.databases, ...migratedDatabases };
      
      // Ensure version is set for migrated configuration
      globalConfig.version = '1.0.0';
      
      // Write updated global configuration
      const configContent = JSON.stringify(globalConfig, null, 2);
      await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
      
      console.log(`[ConfigurationMigration] Successfully migrated legacy configuration from ${legacyPath} to global-config.json`);
      
      // Create migration marker file to track what was migrated
      await this.createMigrationMarker(rootUri, legacyPath, 'legacy-database-config');
      
      return { success: true, data: true };
      
    } catch (error: any) {
      console.error('[ConfigurationMigration] Failed to migrate legacy database configuration:', error);
      return {
        success: false,
        error: `Failed to migrate legacy database configuration: ${error.message}`
      };
    }
  }

  /**
   * Ensure default configuration exists for new workspaces
   */
  private async ensureDefaultConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      
      // Check if global-config.json exists and is valid
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const existingConfig = JSON.parse(configData.toString());
        
        // Check if configuration is complete and valid
        if (this.isConfigurationUpToDate(existingConfig)) {
          return { success: true, data: false }; // Already exists and is valid
        } else {
          console.log('[ConfigurationMigration] Existing configuration is incomplete, updating...');
          // Configuration exists but is incomplete, merge with defaults
          const defaultConfig = this.createDefaultGlobalConfig();
          const mergedConfig = this.mergeConfigurations(existingConfig, defaultConfig);
          
          const configContent = JSON.stringify(mergedConfig, null, 2);
          await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
          
          return { success: true, data: true };
        }
      } catch {
        // File doesn't exist or is invalid, create default
        console.log('[ConfigurationMigration] Creating default global configuration for new workspace...');
        
        const defaultConfig = this.createDefaultGlobalConfig();
        const configContent = JSON.stringify(defaultConfig, null, 2);
        await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
        
        // Create marker for default configuration creation
        await this.createMigrationMarker(rootUri, 'new-workspace', 'default-config-creation');
        
        return { success: true, data: true };
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create default configuration: ${error.message}`
      };
    }
  }

  /**
   * Check if configuration is already up to date
   */
  private isConfigurationUpToDate(config: any): boolean {
    // Check if it has the new structure with databases field
    if (!config.databases) {
      return false;
    }
    
    // Check if version is present and current
    if (!config.version || this.compareVersions(config.version, '1.0.0') < 0) {
      return false;
    }
    
    // Check if database configurations have required fields
    for (const [dbType, dbConfig] of Object.entries(config.databases)) {
      if (dbConfig && typeof dbConfig === 'object') {
        const db = dbConfig as any;
        if (!db.id || !db.name || !db.type || !db.host || !db.port) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Migrate global configuration format
   */
  private migrateGlobalConfigFormat(existingConfig: any): GlobalConfig {
    const migratedConfig: GlobalConfig = {
      version: '1.0.0',
      defaultSettings: {
        timeout: existingConfig.defaultSettings?.timeout || 30000,
        retryCount: existingConfig.defaultSettings?.retryCount || 3
      },
      databases: {}
    };
    
    // Migrate existing database configurations if they exist
    if (existingConfig.databases) {
      migratedConfig.databases = this.migrateDatabaseConfigSet(existingConfig.databases);
    } else {
      // Create default database configurations
      migratedConfig.databases = this.createDefaultDatabaseConfigSet();
    }
    
    return migratedConfig;
  }

  /**
   * Migrate legacy database configuration format
   */
  private migrateLegacyDatabaseConfigFormat(legacyConfig: any): DatabaseConfigSet {
    const migratedDatabases: DatabaseConfigSet = {};
    
    if (legacyConfig.databases) {
      // Handle legacy format from target/qato-db-config.json
      const legacyDatabases = legacyConfig.databases;
      
      console.log('[ConfigurationMigration] Migrating database configurations...');
      
      if (legacyDatabases.mysql) {
        console.log('[ConfigurationMigration] Migrating MySQL configuration');
        migratedDatabases.mysql = this.migrateLegacyDatabaseConfig(legacyDatabases.mysql, 'mysql');
      }
      
      if (legacyDatabases.redis) {
        console.log('[ConfigurationMigration] Migrating Redis configuration');
        migratedDatabases.redis = this.migrateLegacyDatabaseConfig(legacyDatabases.redis, 'redis');
      }
      
      if (legacyDatabases.clickhouse) {
        console.log('[ConfigurationMigration] Migrating ClickHouse configuration');
        migratedDatabases.clickhouse = this.migrateLegacyDatabaseConfig(legacyDatabases.clickhouse, 'clickhouse');
      }
      
      console.log(`[ConfigurationMigration] Migrated ${Object.keys(migratedDatabases).length} database configurations`);
    }
    
    return migratedDatabases;
  }

  /**
   * Migrate individual database configuration
   */
  private migrateLegacyDatabaseConfig(legacyDb: any, dbType: 'mysql' | 'redis' | 'clickhouse'): DatabaseConfig {
    // Preserve existing values from legacy configuration
    const migratedDb: DatabaseConfig = {
      id: legacyDb.id || `migrated-${dbType}-${Date.now()}`,
      name: legacyDb.name || `Migrated ${dbType.charAt(0).toUpperCase() + dbType.slice(1)}`,
      type: dbType,
      host: legacyDb.host || 'localhost',
      port: legacyDb.port || this.getDefaultPort(dbType),
      timeout: legacyDb.timeout || 30000,
      maxConnections: legacyDb.maxConnections || 10,
      ssl: legacyDb.ssl || false,
      description: legacyDb.description || `Migrated from legacy ${dbType} configuration`
    };
    
    // Add type-specific fields based on database type
    if (dbType === 'mysql' || dbType === 'clickhouse') {
      migratedDb.database = legacyDb.database || (dbType === 'mysql' ? 'test' : 'default');
      migratedDb.username = legacyDb.username || (dbType === 'mysql' ? 'root' : 'default');
      migratedDb.password = legacyDb.password || '';
    }
    
    // Handle Redis database field (should be string representation of number)
    if (dbType === 'redis') {
      if (legacyDb.database !== undefined) {
        migratedDb.database = legacyDb.database.toString();
      } else {
        migratedDb.database = '0'; // Default Redis database
      }
    }
    
    console.log(`[ConfigurationMigration] Migrated ${dbType} config: ${migratedDb.name} (${migratedDb.host}:${migratedDb.port})`);
    
    return migratedDb;
  }

  /**
   * Migrate database configuration set
   */
  private migrateDatabaseConfigSet(existingDatabases: any): DatabaseConfigSet {
    const migratedDatabases: DatabaseConfigSet = {};
    
    for (const [dbType, dbConfig] of Object.entries(existingDatabases)) {
      if (dbConfig && typeof dbConfig === 'object') {
        const db = dbConfig as any;
        
        // Check if already in new format
        if (db.id && db.name && db.type && db.host && db.port) {
          migratedDatabases[dbType as keyof DatabaseConfigSet] = db as DatabaseConfig;
        } else {
          // Migrate to new format
          migratedDatabases[dbType as keyof DatabaseConfigSet] = 
            this.migrateLegacyDatabaseConfig(db, dbType as 'mysql' | 'redis' | 'clickhouse');
        }
      }
    }
    
    return migratedDatabases;
  }

  /**
   * Create default global configuration
   */
  private createDefaultGlobalConfig(): GlobalConfig {
    return {
      version: '1.0.0',
      defaultSettings: {
        timeout: 30000,
        retryCount: 3
      },
      databases: this.createDefaultDatabaseConfigSet()
    };
  }

  /**
   * Create default database configuration set
   */
  private createDefaultDatabaseConfigSet(): DatabaseConfigSet {
    const timestamp = Date.now();
    
    return {
      mysql: {
        id: `default-mysql-${timestamp}`,
        name: 'Default MySQL',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'root',
        password: '',
        timeout: 30000,
        maxConnections: 10,
        ssl: false,
        description: 'Default MySQL connection for testing and development'
      },
      redis: {
        id: `default-redis-${timestamp}`,
        name: 'Default Redis',
        type: 'redis',
        host: 'localhost',
        port: 6379,
        database: '0', // Redis database as string
        timeout: 30000,
        maxConnections: 10,
        ssl: false,
        description: 'Default Redis connection for caching and session storage'
      },
      clickhouse: {
        id: `default-clickhouse-${timestamp}`,
        name: 'Default ClickHouse',
        type: 'clickhouse',
        host: 'localhost',
        port: 9000,
        database: 'default',
        username: 'default',
        password: '',
        timeout: 30000,
        maxConnections: 10,
        ssl: false,
        description: 'Default ClickHouse connection for analytics and data processing'
      }
    };
  }

  /**
   * Create backup of existing configuration
   */
  private async createConfigurationBackup(rootUri: vscode.Uri, fileName: string, config: any): Promise<void> {
    try {
      // Create .qato directory if it doesn't exist
      const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
      try {
        await vscode.workspace.fs.stat(qatoDir);
      } catch {
        await vscode.workspace.fs.createDirectory(qatoDir);
      }
      
      // Create backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.backup.${timestamp}`;
      const backupPath = vscode.Uri.joinPath(qatoDir, backupFileName);
      
      const backupContent = JSON.stringify(config, null, 2);
      await vscode.workspace.fs.writeFile(backupPath, Buffer.from(backupContent, 'utf8'));
      
      console.log(`[ConfigurationMigration] Backup created: ${backupFileName}`);
    } catch (error) {
      console.warn(`[ConfigurationMigration] Failed to create backup: ${error}`);
      // Don't fail migration if backup fails
    }
  }

  /**
   * Get default port for database type
   */
  private getDefaultPort(dbType: 'mysql' | 'redis' | 'clickhouse'): number {
    switch (dbType) {
      case 'mysql': return 3306;
      case 'redis': return 6379;
      case 'clickhouse': return 9000;
      default: return 3306;
    }
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) {
        return -1;
      }
      if (v1Part > v2Part) {
        return 1;
      }
    }
    
    return 0;
  }

  /**
   * Validate migrated configuration
   */
  async validateMigratedConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<void>> {
    try {
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      const configData = await vscode.workspace.fs.readFile(globalConfigPath);
      const config: GlobalConfig = JSON.parse(configData.toString());
      
      // Validate structure
      if (!config.version || !config.databases) {
        return {
          success: false,
          error: 'Invalid configuration structure: missing version or databases'
        };
      }
      
      // Validate version format
      if (!this.isValidVersion(config.version)) {
        return {
          success: false,
          error: `Invalid version format: ${config.version}`
        };
      }
      
      // Validate defaultSettings
      if (config.defaultSettings) {
        if (config.defaultSettings.timeout && config.defaultSettings.timeout < 1000) {
          return {
            success: false,
            error: 'Default timeout must be at least 1000ms'
          };
        }
        
        if (config.defaultSettings.retryCount && config.defaultSettings.retryCount < 0) {
          return {
            success: false,
            error: 'Default retry count must be non-negative'
          };
        }
      }
      
      // Validate database configurations
      const supportedDbTypes = ['mysql', 'redis', 'clickhouse'];
      for (const [dbType, dbConfig] of Object.entries(config.databases)) {
        if (!supportedDbTypes.includes(dbType)) {
          return {
            success: false,
            error: `Unsupported database type: ${dbType}`
          };
        }
        
        if (dbConfig) {
          const validationResult = this.validateDatabaseConfig(dbConfig);
          if (!validationResult.success) {
            return {
              success: false,
              error: `Invalid ${dbType} configuration: ${validationResult.error}`
            };
          }
        }
      }
      
      // Validate folder configurations if they exist
      const folderValidationResult = await this.validateFolderConfigurations(rootUri);
      if (!folderValidationResult.success) {
        return folderValidationResult;
      }
      
      console.log('[ConfigurationMigration] Configuration validation passed');
      return { success: true };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Configuration validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate folder configurations
   */
  private async validateFolderConfigurations(rootUri: vscode.Uri): Promise<FileSystemResult<void>> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(rootUri);
      
      for (const [name, type] of entries) {
        if (type === vscode.FileType.Directory && !name.startsWith('.')) {
          const folderPath = vscode.Uri.joinPath(rootUri, name);
          const configPath = vscode.Uri.joinPath(folderPath, 'folder-config.json');
          
          try {
            const configData = await vscode.workspace.fs.readFile(configPath);
            const folderConfig = JSON.parse(configData.toString());
            
            // Validate folder configuration structure
            if (folderConfig.databases) {
              for (const [dbType, dbConfig] of Object.entries(folderConfig.databases)) {
                if (dbConfig && typeof dbConfig === 'object') {
                  const validationResult = this.validateDatabaseConfig(dbConfig as DatabaseConfig);
                  if (!validationResult.success) {
                    return {
                      success: false,
                      error: `Invalid ${dbType} configuration in folder ${name}: ${validationResult.error}`
                    };
                  }
                }
              }
            }
            
          } catch {
            // Folder config doesn't exist or is invalid, skip validation
          }
        }
      }
      
      return { success: true };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Folder configuration validation failed: ${error.message}`
      };
    }
  }

  /**
   * Check if version string is valid
   */
  private isValidVersion(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  /**
   * Validate individual database configuration
   */
  private validateDatabaseConfig(config: DatabaseConfig): FileSystemResult<void> {
    if (!config.id || !config.name || !config.type || !config.host || !config.port) {
      return {
        success: false,
        error: 'Missing required fields: id, name, type, host, and port are required'
      };
    }
    
    if (config.port < 1 || config.port > 65535) {
      return {
        success: false,
        error: 'Port must be between 1 and 65535'
      };
    }
    
    return { success: true };
  }

  /**
   * Create migration log to track what was migrated
   */
  private async createMigrationLog(rootUri: vscode.Uri, migrationPerformed: boolean): Promise<void> {
    try {
      // Create .qato directory if it doesn't exist
      const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
      try {
        await vscode.workspace.fs.stat(qatoDir);
      } catch {
        await vscode.workspace.fs.createDirectory(qatoDir);
      }
      
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        migrationPerformed,
        version: '1.0.0',
        details: {
          globalConfigMigrated: migrationPerformed,
          legacyDatabaseConfigMigrated: migrationPerformed,
          defaultConfigCreated: migrationPerformed
        }
      };
      
      const logPath = vscode.Uri.joinPath(qatoDir, 'migration.log');
      let existingLog: any[] = [];
      
      // Read existing log if it exists
      try {
        const logData = await vscode.workspace.fs.readFile(logPath);
        existingLog = JSON.parse(logData.toString());
      } catch {
        // No existing log, start fresh
      }
      
      // Append new entry
      existingLog.push(logEntry);
      
      // Write updated log
      const logContent = JSON.stringify(existingLog, null, 2);
      await vscode.workspace.fs.writeFile(logPath, Buffer.from(logContent, 'utf8'));
      
      console.log('[ConfigurationMigration] Migration log updated');
    } catch (error) {
      console.warn('[ConfigurationMigration] Failed to create migration log:', error);
      // Don't fail migration if logging fails
    }
  }

  /**
   * Create migration marker to track specific migrations
   */
  private async createMigrationMarker(rootUri: vscode.Uri, sourcePath: string, migrationType: string): Promise<void> {
    try {
      const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
      try {
        await vscode.workspace.fs.stat(qatoDir);
      } catch {
        await vscode.workspace.fs.createDirectory(qatoDir);
      }
      
      const marker = {
        timestamp: new Date().toISOString(),
        sourcePath,
        migrationType,
        targetPath: 'global-config.json',
        version: '1.0.0'
      };
      
      const markerPath = vscode.Uri.joinPath(qatoDir, `migration-${migrationType}.json`);
      const markerContent = JSON.stringify(marker, null, 2);
      await vscode.workspace.fs.writeFile(markerPath, Buffer.from(markerContent, 'utf8'));
      
      console.log(`[ConfigurationMigration] Migration marker created: ${migrationType}`);
    } catch (error) {
      console.warn('[ConfigurationMigration] Failed to create migration marker:', error);
      // Don't fail migration if marker creation fails
    }
  }

  /**
   * Check if a specific migration has already been performed
   */
  async checkMigrationStatus(rootUri: vscode.Uri, migrationType: string): Promise<boolean> {
    try {
      const markerPath = vscode.Uri.joinPath(rootUri, '.qato', `migration-${migrationType}.json`);
      await vscode.workspace.fs.stat(markerPath);
      return true; // Marker exists, migration already performed
    } catch {
      return false; // Marker doesn't exist, migration not performed
    }
  }

  /**
   * Test migration scenarios with existing workspace configurations
   */
  async testMigrationScenarios(rootUri: vscode.Uri): Promise<FileSystemResult<any>> {
    try {
      console.log('[ConfigurationMigration] Testing migration scenarios...');
      
      const scenarios = {
        legacyConfigExists: false,
        globalConfigExists: false,
        globalConfigValid: false,
        folderConfigsExist: false,
        migrationNeeded: false,
        backupCreated: false,
        validationPassed: false
      };
      
      // Test 1: Check for legacy configuration files
      const legacyPaths = [
        'target/qato-db-config.json',
        'qato-db-config.json',
        '.qato/db-config.json',
        'db-config.json'
      ];
      
      for (const legacyPath of legacyPaths) {
        try {
          const legacyConfigPath = vscode.Uri.joinPath(rootUri, legacyPath);
          await vscode.workspace.fs.stat(legacyConfigPath);
          scenarios.legacyConfigExists = true;
          console.log(`[ConfigurationMigration] Found legacy config: ${legacyPath}`);
          break;
        } catch {
          // File doesn't exist, continue
        }
      }
      
      // Test 2: Check for existing global configuration
      try {
        const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config = JSON.parse(configData.toString());
        scenarios.globalConfigExists = true;
        scenarios.globalConfigValid = this.isConfigurationUpToDate(config);
        console.log(`[ConfigurationMigration] Global config exists: ${scenarios.globalConfigExists}, valid: ${scenarios.globalConfigValid}`);
      } catch {
        // Global config doesn't exist
      }
      
      // Test 3: Check for folder configurations
      try {
        const entries = await vscode.workspace.fs.readDirectory(rootUri);
        for (const [name, type] of entries) {
          if (type === vscode.FileType.Directory && !name.startsWith('.')) {
            const folderConfigPath = vscode.Uri.joinPath(rootUri, name, 'folder-config.json');
            try {
              await vscode.workspace.fs.stat(folderConfigPath);
              scenarios.folderConfigsExist = true;
              console.log(`[ConfigurationMigration] Found folder config in: ${name}`);
              break;
            } catch {
              // Folder config doesn't exist
            }
          }
        }
      } catch {
        // Error reading directory
      }
      
      // Test 4: Determine if migration is needed
      scenarios.migrationNeeded = scenarios.legacyConfigExists || 
                                  !scenarios.globalConfigExists || 
                                  !scenarios.globalConfigValid;
      
      // Test 5: Test backup creation (dry run)
      if (scenarios.migrationNeeded) {
        try {
          const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
          try {
            await vscode.workspace.fs.stat(qatoDir);
          } catch {
            await vscode.workspace.fs.createDirectory(qatoDir);
          }
          scenarios.backupCreated = true;
        } catch {
          scenarios.backupCreated = false;
        }
      }
      
      // Test 6: Test validation
      if (scenarios.globalConfigExists) {
        const validationResult = await this.validateMigratedConfiguration(rootUri);
        scenarios.validationPassed = validationResult.success;
      }
      
      console.log('[ConfigurationMigration] Migration scenario test results:', scenarios);
      
      return { 
        success: true, 
        data: {
          scenarios,
          recommendations: this.generateMigrationRecommendations(scenarios)
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Migration scenario testing failed: ${error.message}`
      };
    }
  }

  /**
   * Generate migration recommendations based on scenario testing
   */
  private generateMigrationRecommendations(scenarios: any): string[] {
    const recommendations: string[] = [];
    
    if (scenarios.legacyConfigExists && !scenarios.globalConfigExists) {
      recommendations.push('Legacy configuration detected. Migration recommended to preserve existing settings.');
    }
    
    if (!scenarios.globalConfigExists) {
      recommendations.push('No global configuration found. Default configuration will be created.');
    }
    
    if (scenarios.globalConfigExists && !scenarios.globalConfigValid) {
      recommendations.push('Existing global configuration needs updates for compatibility.');
    }
    
    if (scenarios.folderConfigsExist) {
      recommendations.push('Folder configurations detected. Compatibility checks will be performed.');
    }
    
    if (!scenarios.migrationNeeded) {
      recommendations.push('Configuration is up-to-date. No migration needed.');
    }
    
    if (scenarios.migrationNeeded && !scenarios.backupCreated) {
      recommendations.push('Warning: Backup directory creation failed. Manual backup recommended.');
    }
    
    if (scenarios.globalConfigExists && !scenarios.validationPassed) {
      recommendations.push('Configuration validation failed. Automatic fixes will be attempted.');
    }
    
    return recommendations;
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(rootUri: vscode.Uri): Promise<FileSystemResult<any[]>> {
    try {
      const logPath = vscode.Uri.joinPath(rootUri, '.qato', 'migration.log');
      const logData = await vscode.workspace.fs.readFile(logPath);
      const history = JSON.parse(logData.toString());
      return { success: true, data: history };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read migration history: ${error.message}`
      };
    }
  }

  /**
   * Merge existing configuration with default configuration
   */
  private mergeConfigurations(existingConfig: any, defaultConfig: GlobalConfig): GlobalConfig {
    const mergedConfig: GlobalConfig = {
      version: defaultConfig.version,
      defaultSettings: {
        ...defaultConfig.defaultSettings,
        ...existingConfig.defaultSettings
      },
      databases: {
        ...defaultConfig.databases,
        ...existingConfig.databases
      }
    };

    // Ensure each database configuration has all required fields
    for (const [dbType, dbConfig] of Object.entries(mergedConfig.databases)) {
      if (dbConfig) {
        const defaultDbConfig = defaultConfig.databases[dbType as keyof DatabaseConfigSet];
        if (defaultDbConfig) {
          mergedConfig.databases[dbType as keyof DatabaseConfigSet] = {
            ...defaultDbConfig,
            ...dbConfig
          };
        }
      }
    }

    return mergedConfig;
  }

  /**
   * Export configuration for backup or sharing
   */
  async exportConfiguration(rootUri: vscode.Uri): Promise<FileSystemResult<any>> {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        globalConfig: null as any,
        folderConfigs: [] as any[]
      };
      
      // Export global configuration
      try {
        const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        exportData.globalConfig = JSON.parse(configData.toString());
      } catch {
        // Global config doesn't exist
      }
      
      // Export folder configurations
      try {
        const entries = await vscode.workspace.fs.readDirectory(rootUri);
        for (const [name, type] of entries) {
          if (type === vscode.FileType.Directory && !name.startsWith('.')) {
            const folderConfigPath = vscode.Uri.joinPath(rootUri, name, 'folder-config.json');
            try {
              const configData = await vscode.workspace.fs.readFile(folderConfigPath);
              const folderConfig = JSON.parse(configData.toString());
              exportData.folderConfigs.push({
                folderName: name,
                config: folderConfig
              });
            } catch {
              // Folder config doesn't exist
            }
          }
        }
      } catch {
        // Error reading directories
      }
      
      return { success: true, data: exportData };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Configuration export failed: ${error.message}`
      };
    }
  }

  /**
   * Import configuration from exported data
   */
  async importConfiguration(rootUri: vscode.Uri, importData: any): Promise<FileSystemResult<boolean>> {
    try {
      let importPerformed = false;
      
      // Validate import data structure
      if (!importData.version) {
        return {
          success: false,
          error: 'Invalid import data: missing version'
        };
      }
      
      // For template imports, timestamp might not be present
      if (!importData.timestamp && !this.isTemplateImport(importData)) {
        return {
          success: false,
          error: 'Invalid import data: missing timestamp'
        };
      }
      
      // Create backup before import
      const backupResult = await this.exportConfiguration(rootUri);
      if (backupResult.success) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = vscode.Uri.joinPath(rootUri, '.qato', `pre-import-backup-${timestamp}.json`);
        const backupContent = JSON.stringify(backupResult.data, null, 2);
        await vscode.workspace.fs.writeFile(backupPath, Buffer.from(backupContent, 'utf8'));
        console.log('[ConfigurationMigration] Created pre-import backup');
      }
      
      // Import global configuration
      if (importData.globalConfig) {
        const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
        const configContent = JSON.stringify(importData.globalConfig, null, 2);
        await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
        importPerformed = true;
        console.log('[ConfigurationMigration] Imported global configuration');
      }
      
      // Import folder configurations
      if (importData.folderConfigs && Array.isArray(importData.folderConfigs)) {
        for (const folderData of importData.folderConfigs) {
          if (folderData.folderName && folderData.config) {
            const folderPath = vscode.Uri.joinPath(rootUri, folderData.folderName);
            
            // Create folder if it doesn't exist
            try {
              await vscode.workspace.fs.stat(folderPath);
            } catch {
              await vscode.workspace.fs.createDirectory(folderPath);
            }
            
            const configPath = vscode.Uri.joinPath(folderPath, 'folder-config.json');
            const configContent = JSON.stringify(folderData.config, null, 2);
            await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));
            importPerformed = true;
            console.log(`[ConfigurationMigration] Imported configuration for folder: ${folderData.folderName}`);
          }
        }
      }
      
      // Validate imported configuration
      if (importPerformed) {
        const validationResult = await this.validateMigratedConfiguration(rootUri);
        if (!validationResult.success) {
          console.warn('[ConfigurationMigration] Imported configuration validation failed:', validationResult.error);
          // Try to fix issues
          await this.fixConfigurationIssues(rootUri, validationResult.error || '');
        }
        
        // Create import log
        await this.createMigrationMarker(rootUri, 'imported-configuration', 'configuration-import');
      }
      
      return { success: true, data: importPerformed };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Configuration import failed: ${error.message}`
      };
    }
  }

  /**
   * Check if import data is from a template
   */
  private isTemplateImport(importData: any): boolean {
    // Template imports have globalConfig but no timestamp or folderConfigs
    return importData.globalConfig && 
           !importData.timestamp && 
           (!importData.folderConfigs || importData.folderConfigs.length === 0);
  }

  /**
   * Get available configuration templates
   */
  getConfigurationTemplates(): any[] {
    const timestamp = Date.now();
    
    return [
      {
        id: 'development',
        name: 'Development Environment',
        description: 'Local development setup with default localhost connections',
        config: {
          version: '1.0.0',
          defaultSettings: {
            timeout: 30000,
            retryCount: 3
          },
          databases: {
            mysql: {
              id: `dev-mysql-${timestamp}`,
              name: 'Development MySQL',
              type: 'mysql',
              host: 'localhost',
              port: 3306,
              database: 'dev_db',
              username: 'dev_user',
              password: 'dev_pass',
              timeout: 30000,
              description: 'Local MySQL for development'
            },
            redis: {
              id: `dev-redis-${timestamp}`,
              name: 'Development Redis',
              type: 'redis',
              host: 'localhost',
              port: 6379,
              database: '0',
              timeout: 30000,
              description: 'Local Redis for caching'
            },
            clickhouse: {
              id: `dev-clickhouse-${timestamp}`,
              name: 'Development ClickHouse',
              type: 'clickhouse',
              host: 'localhost',
              port: 9000,
              database: 'default',
              username: 'default',
              password: '',
              timeout: 30000,
              description: 'Local ClickHouse for analytics'
            }
          }
        }
      },
      {
        id: 'staging',
        name: 'Staging Environment',
        description: 'Staging environment with remote database connections',
        config: {
          version: '1.0.0',
          defaultSettings: {
            timeout: 45000,
            retryCount: 5
          },
          databases: {
            mysql: {
              id: `staging-mysql-${timestamp}`,
              name: 'Staging MySQL',
              type: 'mysql',
              host: 'staging-db.company.com',
              port: 3306,
              database: 'staging_db',
              username: 'staging_user',
              password: '',
              timeout: 45000,
              ssl: true,
              description: 'Staging MySQL database'
            },
            redis: {
              id: `staging-redis-${timestamp}`,
              name: 'Staging Redis',
              type: 'redis',
              host: 'staging-redis.company.com',
              port: 6379,
              database: '0',
              timeout: 45000,
              ssl: true,
              description: 'Staging Redis cache'
            },
            clickhouse: {
              id: `staging-clickhouse-${timestamp}`,
              name: 'Staging ClickHouse',
              type: 'clickhouse',
              host: 'staging-ch.company.com',
              port: 9000,
              database: 'staging',
              username: 'staging_user',
              password: '',
              timeout: 45000,
              ssl: true,
              description: 'Staging ClickHouse analytics'
            }
          }
        }
      },
      {
        id: 'testing',
        name: 'Testing Environment',
        description: 'Optimized configuration for automated testing',
        config: {
          version: '1.0.0',
          defaultSettings: {
            timeout: 15000,
            retryCount: 1
          },
          databases: {
            mysql: {
              id: `test-mysql-${timestamp}`,
              name: 'Test MySQL',
              type: 'mysql',
              host: 'localhost',
              port: 3306,
              database: 'test_db',
              username: 'test_user',
              password: 'test_pass',
              timeout: 15000,
              description: 'MySQL for automated testing'
            },
            redis: {
              id: `test-redis-${timestamp}`,
              name: 'Test Redis',
              type: 'redis',
              host: 'localhost',
              port: 6379,
              database: '0',
              timeout: 15000,
              description: 'Redis for test caching'
            }
          }
        }
      }
    ];
  }

  /**
   * Ensure backward compatibility with existing configurations
   */
  private async ensureBackwardCompatibility(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      let compatibilityFixesApplied = false;
      
      // Check for old configuration formats that need compatibility fixes
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config = JSON.parse(configData.toString());
        
        // Fix 1: Ensure all database configs have required new fields
        if (config.databases) {
          let configUpdated = false;
          
          for (const [dbType, dbConfig] of Object.entries(config.databases)) {
            if (dbConfig && typeof dbConfig === 'object') {
              const db = dbConfig as any;
              
              // Add missing fields with defaults
              if (!db.maxConnections) {
                db.maxConnections = 10;
                configUpdated = true;
              }
              
              if (db.ssl === undefined) {
                db.ssl = false;
                configUpdated = true;
              }
              
              if (!db.description) {
                db.description = `${db.name || dbType} database connection`;
                configUpdated = true;
              }
              
              // Fix Redis database field type (should be string)
              if (dbType === 'redis' && typeof db.database === 'number') {
                db.database = db.database.toString();
                configUpdated = true;
              }
              
              // Ensure timeout is reasonable
              if (!db.timeout || db.timeout < 1000) {
                db.timeout = 30000;
                configUpdated = true;
              }
            }
          }
          
          // Fix 2: Ensure version is set
          if (!config.version) {
            config.version = '1.0.0';
            configUpdated = true;
          }
          
          // Fix 3: Ensure defaultSettings exist
          if (!config.defaultSettings) {
            config.defaultSettings = {
              timeout: 30000,
              retryCount: 3
            };
            configUpdated = true;
          }
          
          if (configUpdated) {
            const configContent = JSON.stringify(config, null, 2);
            await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
            compatibilityFixesApplied = true;
            console.log('[ConfigurationMigration] Applied backward compatibility fixes to global configuration');
          }
        }
        
      } catch {
        // Configuration doesn't exist or is invalid, no compatibility fixes needed
      }
      
      // Fix 3: Check for folder configurations that need compatibility updates
      const folderCompatibilityResult = await this.fixFolderConfigCompatibility(rootUri);
      if (folderCompatibilityResult.success && folderCompatibilityResult.data) {
        compatibilityFixesApplied = true;
      }
      
      return { success: true, data: compatibilityFixesApplied };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Backward compatibility check failed: ${error.message}`
      };
    }
  }

  /**
   * Fix folder configuration compatibility issues
   */
  private async fixFolderConfigCompatibility(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      let fixesApplied = false;
      
      // Scan for folder-config.json files
      const entries = await vscode.workspace.fs.readDirectory(rootUri);
      
      for (const [name, type] of entries) {
        if (type === vscode.FileType.Directory && !name.startsWith('.')) {
          const folderPath = vscode.Uri.joinPath(rootUri, name);
          const configPath = vscode.Uri.joinPath(folderPath, 'folder-config.json');
          
          try {
            const configData = await vscode.workspace.fs.readFile(configPath);
            const folderConfig = JSON.parse(configData.toString());
            
            let configUpdated = false;
            
            // Ensure inheritFromParent is set
            if (folderConfig.inheritFromParent === undefined) {
              folderConfig.inheritFromParent = true;
              configUpdated = true;
            }
            
            // Fix database configurations if they exist
            if (folderConfig.databases) {
              for (const [dbType, dbConfig] of Object.entries(folderConfig.databases)) {
                if (dbConfig && typeof dbConfig === 'object') {
                  const db = dbConfig as any;
                  
                  // Add missing fields
                  if (!db.maxConnections) {
                    db.maxConnections = 10;
                    configUpdated = true;
                  }
                  
                  if (db.ssl === undefined) {
                    db.ssl = false;
                    configUpdated = true;
                  }
                  
                  // Fix Redis database field type
                  if (dbType === 'redis' && typeof db.database === 'number') {
                    db.database = db.database.toString();
                    configUpdated = true;
                  }
                }
              }
            }
            
            if (configUpdated) {
              const configContent = JSON.stringify(folderConfig, null, 2);
              await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));
              fixesApplied = true;
              console.log(`[ConfigurationMigration] Applied compatibility fixes to folder: ${name}`);
            }
            
          } catch {
            // Folder config doesn't exist or is invalid, skip
          }
        }
      }
      
      return { success: true, data: fixesApplied };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Folder configuration compatibility fix failed: ${error.message}`
      };
    }
  }

  /**
   * Fix configuration issues found during validation
   */
  private async fixConfigurationIssues(rootUri: vscode.Uri, validationError: string): Promise<FileSystemResult<void>> {
    try {
      console.log(`[ConfigurationMigration] Attempting to fix configuration issues: ${validationError}`);
      
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config = JSON.parse(configData.toString());
        
        let configFixed = false;
        
        // Fix missing version
        if (validationError.includes('version') && !config.version) {
          config.version = '1.0.0';
          configFixed = true;
        }
        
        // Fix missing databases
        if (validationError.includes('databases') && !config.databases) {
          config.databases = this.createDefaultDatabaseConfigSet();
          configFixed = true;
        }
        
        // Fix invalid database configurations
        if (config.databases) {
          for (const [dbType, dbConfig] of Object.entries(config.databases)) {
            if (dbConfig && typeof dbConfig === 'object') {
              const db = dbConfig as any;
              
              // Fix missing required fields
              if (!db.id) {
                db.id = `fixed-${dbType}-${Date.now()}`;
                configFixed = true;
              }
              
              if (!db.name) {
                db.name = `Fixed ${dbType.charAt(0).toUpperCase() + dbType.slice(1)}`;
                configFixed = true;
              }
              
              if (!db.type) {
                db.type = dbType;
                configFixed = true;
              }
              
              if (!db.host) {
                db.host = 'localhost';
                configFixed = true;
              }
              
              if (!db.port || db.port < 1 || db.port > 65535) {
                db.port = this.getDefaultPort(dbType as 'mysql' | 'redis' | 'clickhouse');
                configFixed = true;
              }
            }
          }
        }
        
        if (configFixed) {
          const configContent = JSON.stringify(config, null, 2);
          await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
          console.log('[ConfigurationMigration] Configuration issues fixed automatically');
        }
        
      } catch (error) {
        console.warn('[ConfigurationMigration] Could not fix configuration issues:', error);
      }
      
      return { success: true };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to fix configuration issues: ${error.message}`
      };
    }
  }

  /**
   * Force migration of workspace configuration (for manual migration)
   */
  async forceMigration(rootUri: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      console.log('[ConfigurationMigration] Starting forced migration...');
      
      // Remove existing migration markers to force re-migration
      const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
      try {
        const entries = await vscode.workspace.fs.readDirectory(qatoDir);
        for (const [name, type] of entries) {
          if (type === vscode.FileType.File && name.startsWith('migration-')) {
            const markerPath = vscode.Uri.joinPath(qatoDir, name);
            await vscode.workspace.fs.delete(markerPath);
            console.log(`[ConfigurationMigration] Removed migration marker: ${name}`);
          }
        }
      } catch {
        // Directory doesn't exist or is empty, continue
      }
      
      // Perform migration
      return await this.migrateWorkspaceConfiguration(rootUri);
      
    } catch (error: any) {
      return {
        success: false,
        error: `Forced migration failed: ${error.message}`
      };
    }
  }
}