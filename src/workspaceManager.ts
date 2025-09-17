import * as vscode from 'vscode';
import * as path from 'path';
import {
  TestCase,
  WorkspaceTree,
  WorkspaceFolder,
  WorkspaceCollection,
  WorkspaceTestCase,
  FileSystemResult,
  GlobalConfig,
  FolderConfig,
  CollectionConfig,
  DatabaseConfig,
  DatabaseConfigSet
} from './workspaceTypes';
import { ConfigurationMigration } from './configurationMigration';

/**
 * Manages file system operations for QATO workspace persistence
 */
export class WorkspaceManager {
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private rootUri: vscode.Uri | null = null;
  private migrationUtility: ConfigurationMigration;

  constructor() {
    this.migrationUtility = new ConfigurationMigration();
  }

  /**
   * Get the current root URI
   */
  getRootUri(): vscode.Uri | null {
    return this.rootUri;
  }

  /**
   * Initialize the workspace structure at the given root URI
   * Creates .qato directory and handles configuration migration
   */
  async initializeWorkspace(rootUri: vscode.Uri): Promise<FileSystemResult<void>> {
    try {
      this.rootUri = rootUri;

      // Create .qato directory for metadata (optional)
      const qatoDir = vscode.Uri.joinPath(rootUri, '.qato');
      try {
        await vscode.workspace.fs.stat(qatoDir);
      } catch {
        // Directory doesn't exist, create it
        await vscode.workspace.fs.createDirectory(qatoDir);
      }

      // Perform configuration migration and backward compatibility handling
      const migrationResult = await this.migrationUtility.migrateWorkspaceConfiguration(rootUri);
      if (!migrationResult.success) {
        console.warn('[WorkspaceManager] Configuration migration failed:', migrationResult.error);
        // Continue with initialization even if migration fails
      } else if (migrationResult.data) {
        console.log('[WorkspaceManager] Configuration migration completed successfully');
      }

      // Validate the final configuration
      const validationResult = await this.migrationUtility.validateMigratedConfiguration(rootUri);
      if (!validationResult.success) {
        console.warn('[WorkspaceManager] Configuration validation failed:', validationResult.error);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to initialize workspace: ${error.message}`
      };
    }
  }

  /**
   * Read the complete workspace tree from the file system
   * Recursively scans for folders, collections, and test cases
   */
  async getWorkspaceTree(rootUri: vscode.Uri): Promise<FileSystemResult<WorkspaceTree>> {
    try {
      this.rootUri = rootUri;
      const folders: WorkspaceFolder[] = [];

      // Read global config if it exists
      let globalConfig: GlobalConfig | undefined;
      try {
        const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        globalConfig = JSON.parse(configData.toString());
      } catch {
        // Global config doesn't exist or is invalid, continue without it
      }

      // Read all directories in the root (excluding .qato)
      const entries = await vscode.workspace.fs.readDirectory(rootUri);

      for (const [name, type] of entries) {
        // Skip files and hidden directories
        if (type !== vscode.FileType.Directory || name.startsWith('.')) {
          continue;
        }

        const folderPath = vscode.Uri.joinPath(rootUri, name);
        const folder = await this.readFolder(folderPath, name);
        if (folder) {
          folders.push(folder);
        }
      }

      const workspaceTree: WorkspaceTree = {
        rootPath: rootUri.fsPath,
        folders,
        globalConfig
      };

      return { success: true, data: workspaceTree };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read workspace tree: ${error.message}`
      };
    }
  }

  /**
   * Read a single folder and its collections
   */
  private async readFolder(folderUri: vscode.Uri, folderName: string): Promise<WorkspaceFolder | null> {
    try {
      const collections: WorkspaceCollection[] = [];
      const folderId = this.generateId(folderName);

      // Read folder config if it exists
      let folderConfig: FolderConfig | undefined;
      try {
        const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
        const configData = await vscode.workspace.fs.readFile(configPath);
        folderConfig = JSON.parse(configData.toString());
      } catch {
        // Config doesn't exist, continue without it
      }

      // Read all subdirectories (collections)
      const entries = await vscode.workspace.fs.readDirectory(folderUri);

      for (const [name, type] of entries) {
        // Skip files and config files
        if (type !== vscode.FileType.Directory) {
          continue;
        }

        const collectionPath = vscode.Uri.joinPath(folderUri, name);
        const collection = await this.readCollection(collectionPath, name, folderId);
        if (collection) {
          collections.push(collection);
        }
      }

      return {
        id: folderId,
        name: folderName,
        path: folderUri.fsPath,
        collections,
        config: folderConfig
      };
    } catch (error: any) {
      console.error(`Failed to read folder ${folderName}:`, error);
      return null;
    }
  }

  /**
   * Read a single collection and its test cases
   */
  private async readCollection(collectionUri: vscode.Uri, collectionName: string, folderId: string): Promise<WorkspaceCollection | null> {
    try {
      const testCases: WorkspaceTestCase[] = [];
      const collectionId = this.generateId(`${folderId}_${collectionName}`);

      // Read collection config if it exists
      let collectionConfig: CollectionConfig | undefined;
      try {
        const configPath = vscode.Uri.joinPath(collectionUri, 'collection-config.json');
        const configData = await vscode.workspace.fs.readFile(configPath);
        collectionConfig = JSON.parse(configData.toString());
      } catch {
        // Config doesn't exist, continue without it
      }

      // Read all .test.json files
      const entries = await vscode.workspace.fs.readDirectory(collectionUri);

      for (const [name, type] of entries) {
        // Only process .test.json files
        if (type !== vscode.FileType.File || !name.endsWith('.test.json')) {
          continue;
        }

        const testCasePath = vscode.Uri.joinPath(collectionUri, name);
        const testCase = await this.readTestCase(testCasePath, collectionId);
        if (testCase) {
          testCases.push(testCase);
        }
      }

      return {
        id: collectionId,
        name: collectionName,
        path: collectionUri.fsPath,
        folderId,
        testCases,
        config: collectionConfig
      };
    } catch (error: any) {
      console.error(`Failed to read collection ${collectionName}:`, error);
      return null;
    }
  }

  /**
   * Read a single test case file and parse its content
   */
  private async readTestCase(testCaseUri: vscode.Uri, collectionId: string): Promise<WorkspaceTestCase | null> {
    try {
      const fileData = await vscode.workspace.fs.readFile(testCaseUri);
      const testCase: TestCase = JSON.parse(fileData.toString());

      // Ensure the test case has the correct collectionId
      testCase.collectionId = collectionId;

      const fileName = path.basename(testCaseUri.fsPath, '.test.json');

      return {
        id: testCase.id,
        name: testCase.name,
        path: testCaseUri.fsPath,
        collectionId,
        testCase
      };
    } catch (error: any) {
      console.error(`Failed to read test case ${testCaseUri.fsPath}:`, error);
      return null;
    }
  }

  /**
   * Load a single test case from a file URI
   */
  async loadTestCase(uri: vscode.Uri): Promise<FileSystemResult<TestCase>> {
    try {
      const fileData = await vscode.workspace.fs.readFile(uri);
      const testCase: TestCase = JSON.parse(fileData.toString());

      return { success: true, data: testCase };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load test case: ${error.message}`
      };
    }
  }

  /**
   * Save a test case to the specified URI
   * Creates parent directories if they don't exist
   */
  async saveTestCase(uri: vscode.Uri, testCase: TestCase): Promise<FileSystemResult<void>> {
    try {
      // Ensure parent directory exists
      const parentDir = vscode.Uri.joinPath(uri, '..');
      try {
        await vscode.workspace.fs.stat(parentDir);
      } catch {
        await vscode.workspace.fs.createDirectory(parentDir);
      }

      // Serialize test case with proper formatting
      const content = JSON.stringify(testCase, null, 2);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to save test case: ${error.message}`
      };
    }
  }

  /**
   * Create a new folder in the workspace
   */
  async createFolder(name: string, parentUri?: vscode.Uri): Promise<FileSystemResult<string>> {
    try {
      const rootUri = parentUri || this.rootUri;
      if (!rootUri) {
        return { success: false, error: 'No workspace root set' };
      }

      const folderUri = vscode.Uri.joinPath(rootUri, name);
      await vscode.workspace.fs.createDirectory(folderUri);

      // Create default folder config
      const folderConfig: FolderConfig = {
        description: `Folder: ${name}`
      };
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
      const configContent = JSON.stringify(folderConfig, null, 2);
      await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));

      return { success: true, data: folderUri.fsPath };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create folder: ${error.message}`
      };
    }
  }

  /**
   * Create a new collection in a folder
   */
  async createCollection(name: string, folderUri: vscode.Uri): Promise<FileSystemResult<string>> {
    try {
      const collectionUri = vscode.Uri.joinPath(folderUri, name);
      await vscode.workspace.fs.createDirectory(collectionUri);

      // Create default collection config
      const collectionConfig: CollectionConfig = {
        description: `Collection: ${name}`
      };
      const configPath = vscode.Uri.joinPath(collectionUri, 'collection-config.json');
      const configContent = JSON.stringify(collectionConfig, null, 2);
      await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));

      return { success: true, data: collectionUri.fsPath };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create collection: ${error.message}`
      };
    }
  }

  /**
   * Set up file system watcher for the workspace
   * Watches for changes to directories, config files, and test files
   */
  setupFileWatcher(
    rootUri: vscode.Uri,
    onChanged: (workspaceTree: WorkspaceTree) => void,
    onDatabaseConfigChanged?: (path: string, config: DatabaseConfigSet) => void
  ): void {
    // Dispose existing watcher
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    // Create comprehensive watcher for all relevant files and directories
    // Watch for: directories, config files, and test files
    const pattern = new vscode.RelativePattern(rootUri, '**/*');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Handle file/directory changes with debouncing to avoid excessive updates
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleChange = async (uri: vscode.Uri) => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Check if this is a database configuration change
      const fileName = path.basename(uri.fsPath);
      if ((fileName === 'global-config.json' || fileName === 'folder-config.json') && onDatabaseConfigChanged) {
        try {
          let config: DatabaseConfigSet = {};

          if (fileName === 'global-config.json') {
            const result = await this.getGlobalDatabaseConfig(rootUri);
            if (result.success && result.data) {
              config = result.data;
            }
          } else if (fileName === 'folder-config.json') {
            const folderUri = vscode.Uri.joinPath(uri, '..');
            const result = await this.getFolderDatabaseConfig(folderUri);
            if (result.success && result.data) {
              config = result.data;
            }
          }

          onDatabaseConfigChanged(uri.fsPath, config);
        } catch (error) {
          console.error('[WorkspaceManager] Error handling database config change:', error);
        }
      }

      // Debounce the update to avoid rapid successive calls
      debounceTimer = setTimeout(async () => {
        console.log('[WorkspaceManager] File system change detected, refreshing workspace tree...');
        const result = await this.getWorkspaceTree(rootUri);
        if (result.success && result.data) {
          onChanged(result.data);
        }
      }, 100); // 100ms debounce
    };

    this.fileWatcher.onDidCreate(handleChange);
    this.fileWatcher.onDidChange(handleChange);
    this.fileWatcher.onDidDelete(handleChange);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfig(rootUri: vscode.Uri, config: GlobalConfig): Promise<FileSystemResult<void>> {
    try {
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      const configContent = JSON.stringify(config, null, 2);
      await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update global config: ${error.message}`
      };
    }
  }

  /**
   * Update folder configuration
   */
  async updateFolderConfig(folderUri: vscode.Uri, config: FolderConfig): Promise<FileSystemResult<void>> {
    try {
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
      const configContent = JSON.stringify(config, null, 2);
      await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update folder config: ${error.message}`
      };
    }
  }

  /**
   * Get global database configuration
   */
  async getGlobalDatabaseConfig(rootUri: vscode.Uri): Promise<FileSystemResult<DatabaseConfigSet>> {
    try {
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      const configData = await vscode.workspace.fs.readFile(globalConfigPath);
      const globalConfig: GlobalConfig = JSON.parse(configData.toString());

      return { success: true, data: globalConfig.databases || {} };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read global database config: ${error.message}`
      };
    }
  }

  /**
   * Set global database configuration
   */
  async setGlobalDatabaseConfig(rootUri: vscode.Uri, databases: DatabaseConfigSet): Promise<FileSystemResult<void>> {
    try {
      // Read existing global config
      let globalConfig: GlobalConfig;
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');

      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        globalConfig = JSON.parse(configData.toString());
      } catch {
        // Create default config if it doesn't exist
        globalConfig = {
          version: '1.0.0',
          defaultSettings: {
            timeout: 30000,
            retryCount: 3
          },
          databases: {}
        };
      }

      // Update database configuration
      globalConfig.databases = { ...globalConfig.databases, ...databases };

      // Validate configuration
      const validationResult = this.validateDatabaseConfigSet(databases);
      if (!validationResult.success) {
        return validationResult;
      }

      // Write updated config
      const configContent = JSON.stringify(globalConfig, null, 2);
      await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to set global database config: ${error.message}`
      };
    }
  }

  /**
   * Get folder database configuration
   */
  async getFolderDatabaseConfig(folderUri: vscode.Uri): Promise<FileSystemResult<DatabaseConfigSet>> {
    try {
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
      const configData = await vscode.workspace.fs.readFile(configPath);
      const folderConfig: FolderConfig = JSON.parse(configData.toString());

      return { success: true, data: folderConfig.databases || {} };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read folder database config: ${error.message}`
      };
    }
  }

  /**
   * Set folder database configuration
   */
  async setFolderDatabaseConfig(folderUri: vscode.Uri, databases: DatabaseConfigSet): Promise<FileSystemResult<void>> {
    try {
      // Read existing folder config
      let folderConfig: FolderConfig;
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');

      try {
        const configData = await vscode.workspace.fs.readFile(configPath);
        folderConfig = JSON.parse(configData.toString());
      } catch {
        // Create default config if it doesn't exist
        const folderName = path.basename(folderUri.fsPath);
        folderConfig = {
          description: `Folder: ${folderName}`,
          inheritFromParent: true
        };
      }

      // Update database configuration
      folderConfig.databases = { ...folderConfig.databases, ...databases };

      // Validate configuration
      const validationResult = this.validateDatabaseConfigSet(databases);
      if (!validationResult.success) {
        return validationResult;
      }

      // Write updated config
      const configContent = JSON.stringify(folderConfig, null, 2);
      await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to set folder database config: ${error.message}`
      };
    }
  }

  /**
   * Delete database configuration for a specific database type
   */
  async deleteDatabaseConfig(
    uri: vscode.Uri,
    dbType: 'mysql' | 'redis' | 'clickhouse',
    level: 'global' | 'folder'
  ): Promise<FileSystemResult<void>> {
    try {
      if (level === 'global') {
        const result = await this.getGlobalDatabaseConfig(uri);
        if (!result.success || !result.data) {
          return { success: false, error: 'Failed to read global config' };
        }

        const updatedConfig = { ...result.data };
        delete updatedConfig[dbType];

        return await this.setGlobalDatabaseConfig(uri, updatedConfig);
      } else {
        const result = await this.getFolderDatabaseConfig(uri);
        if (!result.success || !result.data) {
          return { success: false, error: 'Failed to read folder config' };
        }

        const updatedConfig = { ...result.data };
        delete updatedConfig[dbType];

        return await this.setFolderDatabaseConfig(uri, updatedConfig);
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to delete database config: ${error.message}`
      };
    }
  }

  /**
   * Validate database configuration set
   */
  private validateDatabaseConfigSet(configSet: DatabaseConfigSet): FileSystemResult<void> {
    try {
      for (const [dbType, config] of Object.entries(configSet)) {
        if (config) {
          const validationResult = this.validateDatabaseConfig(config);
          if (!validationResult.success) {
            return {
              success: false,
              error: `Invalid ${dbType} configuration: ${validationResult.error}`
            };
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Configuration validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate individual database configuration
   */
  private validateDatabaseConfig(config: DatabaseConfig): FileSystemResult<void> {
    try {
      // Required fields validation
      if (!config.id || !config.name || !config.type || !config.host) {
        return {
          success: false,
          error: 'Missing required fields: id, name, type, and host are required'
        };
      }

      // Port validation
      if (!config.port || config.port < 1 || config.port > 65535) {
        return {
          success: false,
          error: 'Port must be a valid number between 1 and 65535'
        };
      }

      // Type-specific validation
      switch (config.type) {
        case 'mysql':
          if (!config.database || !config.username) {
            return {
              success: false,
              error: 'MySQL configuration requires database and username fields'
            };
          }
          break;
        case 'clickhouse':
          if (!config.database || !config.username) {
            return {
              success: false,
              error: 'ClickHouse configuration requires database and username fields'
            };
          }
          break;
        case 'redis':
          // Redis has fewer required fields, but validate database number if provided
          if (config.database !== undefined && config.database !== '') {
            const dbNum = parseInt(config.database, 10);
            if (isNaN(dbNum) || dbNum < 0 || dbNum > 15) {
              return {
                success: false,
                error: 'Redis database number must be a valid number between 0 and 15'
              };
            }
          }
          break;
        default:
          return {
            success: false,
            error: `Unsupported database type: ${config.type}`
          };
      }

      // Timeout validation
      if (config.timeout !== undefined && config.timeout < 1000) {
        return {
          success: false,
          error: 'Timeout must be at least 1000ms'
        };
      }

      // Max connections validation
      if (config.maxConnections !== undefined && config.maxConnections < 1) {
        return {
          success: false,
          error: 'Max connections must be at least 1'
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Configuration validation failed: ${error.message}`
      };
    }
  }

  /**
   * Migrate workspace configuration manually
   */
  async migrateWorkspaceConfiguration(rootUri?: vscode.Uri): Promise<FileSystemResult<boolean>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available for migration' };
    }

    return await this.migrationUtility.migrateWorkspaceConfiguration(targetUri);
  }

  /**
   * Check if workspace configuration needs migration
   */
  async checkMigrationNeeded(rootUri?: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      const targetUri = rootUri || this.rootUri;
      if (!targetUri) {
        return { success: false, error: 'No workspace root available' };
      }

      // Check if global-config.json exists and is up to date
      const globalConfigPath = vscode.Uri.joinPath(targetUri, 'global-config.json');
      try {
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config = JSON.parse(configData.toString());
        
        // Check if configuration is up to date
        const isUpToDate = config.version && 
                          config.databases && 
                          typeof config.databases === 'object';
        
        return { success: true, data: !isUpToDate };
      } catch {
        // File doesn't exist, migration needed
        return { success: true, data: true };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to check migration status: ${error.message}`
      };
    }
  }

  /**
   * Get migration utility for external use
   */
  getMigrationUtility(): ConfigurationMigration {
    return this.migrationUtility;
  }

  /**
   * Force migration of workspace configuration
   */
  async forceMigration(rootUri?: vscode.Uri): Promise<FileSystemResult<boolean>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available for migration' };
    }

    return await this.migrationUtility.forceMigration(targetUri);
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(rootUri?: vscode.Uri): Promise<FileSystemResult<any[]>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available' };
    }

    return await this.migrationUtility.getMigrationHistory(targetUri);
  }

  /**
   * Check migration status for specific migration type
   */
  async checkMigrationStatus(migrationType: string, rootUri?: vscode.Uri): Promise<FileSystemResult<boolean>> {
    try {
      const targetUri = rootUri || this.rootUri;
      if (!targetUri) {
        return { success: false, error: 'No workspace root available' };
      }

      const status = await this.migrationUtility.checkMigrationStatus(targetUri, migrationType);
      return { success: true, data: status };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to check migration status: ${error.message}`
      };
    }
  }

  /**
   * Test migration scenarios with existing workspace configurations
   */
  async testMigrationScenarios(rootUri?: vscode.Uri): Promise<FileSystemResult<any>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available for migration testing' };
    }

    return await this.migrationUtility.testMigrationScenarios(targetUri);
  }

  /**
   * Export configuration for backup or sharing
   */
  async exportConfiguration(rootUri?: vscode.Uri): Promise<FileSystemResult<any>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available for export' };
    }

    return await this.migrationUtility.exportConfiguration(targetUri);
  }

  /**
   * Import configuration from exported data
   */
  async importConfiguration(importData: any, rootUri?: vscode.Uri): Promise<FileSystemResult<boolean>> {
    const targetUri = rootUri || this.rootUri;
    if (!targetUri) {
      return { success: false, error: 'No workspace root available for import' };
    }

    return await this.migrationUtility.importConfiguration(targetUri, importData);
  }

  /**
   * Generate a consistent ID from a name
   */
  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
}