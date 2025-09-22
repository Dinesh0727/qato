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
  CollectionConfig
} from './workspaceTypes';

/**
 * Manages file system operations for QATO workspace persistence
 */
export class WorkspaceManager {
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private rootUri: vscode.Uri | null = null;

  /**
   * Get the current root URI
   */
  getRootUri(): vscode.Uri | null {
    return this.rootUri;
  }

  /**
   * Initialize the workspace structure at the given root URI
   * Creates .qato directory and global-config.json if they don't exist
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

      // Ensure templates file exists
      const templatesFile = vscode.Uri.joinPath(qatoDir, 'templates.json');
      try {
        await vscode.workspace.fs.stat(templatesFile);
      } catch {
        const emptyTemplates = JSON.stringify({ templates: [] }, null, 2);
        await vscode.workspace.fs.writeFile(templatesFile, Buffer.from(emptyTemplates, 'utf8'));
      }

      // Create global-config.json if it doesn't exist
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      try {
        await vscode.workspace.fs.stat(globalConfigPath);
      } catch {
        // File doesn't exist, create default config
        const defaultConfig: GlobalConfig = {
          version: '1.0.0',
          defaultSettings: {
            timeout: 30000,
            retryCount: 3
          },
          databases: [
            {
              id: 'default-mysql',
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
              description: 'Default MySQL connection for testing'
            },
            {
              id: 'default-redis',
              name: 'Default Redis',
              type: 'redis',
              host: 'localhost',
              port: 6379,
              timeout: 30000,
              maxConnections: 10,
              ssl: false,
              description: 'Default Redis connection for caching and session storage'
            },
            {
              id: 'default-clickhouse',
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
              description: 'Default ClickHouse connection for analytics'
            }
          ],
          defaultDatabaseConnections: {
            sql: 'default-mysql',
            redis: 'default-redis',
            clickhouse: 'default-clickhouse'
          }
        };
        const configContent = JSON.stringify(defaultConfig, null, 2);
        await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
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
  setupFileWatcher(rootUri: vscode.Uri, onChanged: (workspaceTree: WorkspaceTree) => void): void {
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
    const handleChange = async () => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
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
      console.log('[WorkspaceManager] Updating global config:', JSON.stringify(config, null, 2));
      const globalConfigPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      const configContent = JSON.stringify(config, null, 2);
      await vscode.workspace.fs.writeFile(globalConfigPath, Buffer.from(configContent, 'utf8'));
      console.log('[WorkspaceManager] Global config saved successfully to:', globalConfigPath.fsPath);
      
      return { success: true };
    } catch (error: any) {
      console.error('[WorkspaceManager] Failed to update global config:', error);
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
   * Generate a consistent ID from a name
   */
  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Get URI for the templates file under .qato
   */
  private getTemplatesFileUri(): vscode.Uri | null {
    if (!this.rootUri) return null;
    return vscode.Uri.joinPath(this.rootUri, '.qato', 'templates.json');
  }

  /**
   * Read all step templates from the workspace templates file
   */
  async readStepTemplates(): Promise<FileSystemResult<any[]>> {
    try {
      const fileUri = this.getTemplatesFileUri();
      if (!fileUri) return { success: false, error: 'No workspace root set' };
      const fileData = await vscode.workspace.fs.readFile(fileUri);
      const parsed = JSON.parse(fileData.toString());
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.templates) ? parsed.templates : [];
      return { success: true, data: list };
    } catch (error: any) {
      return { success: false, error: `Failed to read templates: ${error.message}` };
    }
  }

  /**
   * Write all step templates to the workspace templates file
   */
  async writeStepTemplates(templates: any[]): Promise<FileSystemResult<void>> {
    try {
      const fileUri = this.getTemplatesFileUri();
      if (!fileUri) return { success: false, error: 'No workspace root set' };
      const content = JSON.stringify({ templates }, null, 2);
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Failed to write templates: ${error.message}` };
    }
  }
}