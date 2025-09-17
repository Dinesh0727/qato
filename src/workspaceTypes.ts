// Types for file system workspace management

// Core types (copied from webview-ui/src/types.ts to avoid import issues)
export interface TestCase {
  id: string;
  name: string;
  collectionId: string;
  steps: TestStep[];
  createdAt: Date;
  updatedAt: Date;
  flowControlConfig?: FlowControlConfig;
}

export interface TestStep {
  id: string;
  name: string;
  type: 'api' | 'sql' | 'redis' | 'clickhouse';
  delayMs?: number;
  order: number;
  config: SqlStepConfig | RedisStepConfig | ApiStepConfig | ClickhouseStepConfig;
  validations?: ValidationConfig[];
  flowControlConfig?: StepFlowControlConfig;
  uiConfig?: StepUIConfig;
}

export interface SqlStepConfig {
  query: string;
  database?: string;
}

export interface RedisStepConfig {
  command: string;
  database?: number;
}

export interface ApiStepConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body?: string;
  extractVars?: Array<{ name: string; path: string; type?: 'string' | 'integer' | 'float' | 'boolean' }>;
}

export interface ClickhouseStepConfig {
  query: string;
  database?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export interface ValidationConfig {
  id: string;
  type: 'api' | 'sql' | 'clickhouse';
  target: string;
  expectedValue: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  stepId: string;
  customErrorMessage?: string;
}

export interface FlowControlConfig {
  id: string;
  testCaseId: string;
  stopOnFailure: boolean;
  continueOnFailure: boolean;
  skipRemainingSteps: boolean;
  failureThreshold: number;
}

export interface StepFlowControlConfig {
  continueOnFailure: boolean;
  skipOnDependencyFailure: boolean;
  retryCount: number;
  timeout: number;
}

export interface StepUIConfig {
  displayName: string;
  description: string;
  icon: string;
  color: string;
}

export interface Collection {
  id: string;
  name: string;
  folderId: string;
  testCases: TestCase[];
}

export interface Folder {
  id: string;
  name: string;
  collections: Collection[];
}

/**
 * Represents the complete workspace tree structure loaded from the file system
 */
export interface WorkspaceTree {
  rootPath: string;
  folders: WorkspaceFolder[];
  globalConfig?: GlobalConfig;
}

/**
 * File system representation of a folder with its collections
 */
export interface WorkspaceFolder {
  id: string;
  name: string;
  path: string; // Absolute path to the folder
  collections: WorkspaceCollection[];
  config?: FolderConfig;
}

/**
 * File system representation of a collection with its test cases
 */
export interface WorkspaceCollection {
  id: string;
  name: string;
  path: string; // Absolute path to the collection folder
  folderId: string;
  testCases: WorkspaceTestCase[];
  config?: CollectionConfig;
}

/**
 * File system representation of a test case
 */
export interface WorkspaceTestCase {
  id: string;
  name: string;
  path: string; // Absolute path to the .test.json file
  collectionId: string;
  testCase: TestCase; // The actual test case data
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  timeout?: number;
  maxConnections?: number;
  ssl?: boolean;
  description?: string;
}

/**
 * Set of database configurations for different database types
 */
export interface DatabaseConfigSet {
  mysql?: DatabaseConfig;
  redis?: DatabaseConfig;
  clickhouse?: DatabaseConfig;
}

/**
 * Configuration context for resolution and inheritance
 */
export interface ConfigurationContext {
  path: string;
  level: 'global' | 'folder' | 'collection';
  resolvedConfig: DatabaseConfigSet;
  inheritanceChain: string[];
}

/**
 * Database configuration error types
 */
export interface ConfigurationError {
  type: 'validation' | 'connection' | 'inheritance' | 'storage';
  message: string;
  path?: string;
  details?: Record<string, any>;
}

/**
 * Database configuration manager interface
 */
export interface DatabaseConfigManager {
  // Configuration Resolution
  resolveConfig(path: string): Promise<DatabaseConfigSet>;
  getConfigForPath(path: string, dbType: 'mysql' | 'redis' | 'clickhouse'): Promise<DatabaseConfig | null>;
  
  // Configuration Management
  setGlobalConfig(config: DatabaseConfigSet): Promise<void>;
  setFolderConfig(folderPath: string, config: DatabaseConfigSet): Promise<void>;
  
  // Cache Management
  invalidateCache(path?: string): void;
  preloadConfigurations(): Promise<void>;
}

/**
 * Global workspace configuration
 */
export interface GlobalConfig {
  version: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  databases: DatabaseConfigSet;
}

/**
 * Folder-level configuration
 */
export interface FolderConfig {
  description?: string;
  defaultCollectionSettings?: {
    timeout?: number;
  };
  databases?: DatabaseConfigSet;
  inheritFromParent?: boolean;
}

/**
 * Collection-level configuration (future use)
 */
export interface CollectionConfig {
  description?: string;
  defaultTestSettings?: {
    timeout?: number;
    retryCount?: number;
  };
}

/**
 * Message types for extension <-> webview communication
 */
export type WorkspaceMessage = 
  | { command: 'initializeWorkspace'; payload: { rootPath?: string } }
  | { command: 'workspaceInitialized'; payload: { workspaceTree: WorkspaceTree } }
  | { command: 'saveTestCase'; payload: { testCase: TestCase; collectionPath: string } }
  | { command: 'createFolder'; payload: { name: string; parentPath: string } }
  | { command: 'createCollection'; payload: { name: string; folderPath: string } }
  | { command: 'deleteTestCase'; payload: { testCasePath: string } }
  | { command: 'deleteCollection'; payload: { collectionPath: string } }
  | { command: 'deleteFolder'; payload: { folderPath: string } }
  | { command: 'updateGlobalConfig'; payload: { config: GlobalConfig } }
  | { command: 'updateFolderConfig'; payload: { folderPath: string; config: FolderConfig } }
  | { command: 'fileSystemChanged'; payload: { workspaceTree: WorkspaceTree } }
  | { command: 'workspaceError'; payload: { error: string } }
  | { command: 'getDatabaseConfig'; payload: { path: string; dbType?: 'mysql' | 'redis' | 'clickhouse' } }
  | { command: 'setDatabaseConfig'; payload: { path: string; config: DatabaseConfigSet; level: 'global' | 'folder' } }
  | { command: 'resolveDatabaseConfig'; payload: { path: string } }
  | { command: 'testDatabaseConnection'; payload: { config: DatabaseConfig } }
  | { command: 'runGeneratedTest'; payload: { featureFileContent: string; folderPath?: string } }
  | { command: 'databaseConfigResolved'; payload: { path: string; config: DatabaseConfigSet; context: ConfigurationContext } }
  | { command: 'databaseConfigUpdated'; payload: { path: string; config: DatabaseConfigSet } }
  | { command: 'databaseConnectionTestResult'; payload: { success: boolean; error?: string; details?: any } }
  | { command: 'databaseConfigError'; payload: { error: ConfigurationError } }
  | { command: 'migrationStatus'; payload: { needed: boolean; history?: any[] } }
  | { command: 'performMigration'; payload: { force?: boolean } }
  | { command: 'migrationCompleted'; payload: { success: boolean; migrationPerformed: boolean; error?: string } }
  | { command: 'getMigrationHistory'; payload: {} }
  | { command: 'migrationHistoryResult'; payload: { success: boolean; history?: any[]; error?: string } }
  | { command: 'testMigrationScenarios'; payload: {} }
  | { command: 'migrationScenariosResult'; payload: { success: boolean; scenarios?: any; recommendations?: string[]; error?: string } }
  | { command: 'exportConfiguration'; payload: {} }
  | { command: 'configurationExported'; payload: { success: boolean; data?: any; error?: string } }
  | { command: 'importConfiguration'; payload: { data: any } }
  | { command: 'configurationImported'; payload: { success: boolean; imported: boolean; error?: string } };

/**
 * File system operation result
 */
export interface FileSystemResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}