import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig, DatabaseConfigSet, GlobalConfig, FolderConfig } from '../workspaceTypes';

// Enhanced Mock WorkspaceManager with file system simulation
class MockFileSystemWorkspaceManager {
  private globalConfig: GlobalConfig | null = null;
  private folderConfigs = new Map<string, FolderConfig>();
  private fileSystem = new Map<string, string>();

  async updateGlobalConfig(rootUri: vscode.Uri, config: GlobalConfig) {
    this.globalConfig = { ...config };
    const configPath = path.join(rootUri.fsPath, 'global-config.json');
    this.fileSystem.set(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  }

  async updateFolderConfig(folderUri: vscode.Uri, config: FolderConfig) {
    this.folderConfigs.set(folderUri.fsPath, config);
    const configPath = path.join(folderUri.fsPath, 'folder-config.json');
    this.fileSystem.set(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  }

  async getWorkspaceTree(rootUri: vscode.Uri) {
    return {
      success: true,
      data: {
        rootPath: rootUri.fsPath,
        folders: [
          { path: path.join(rootUri.fsPath, 'frontend') },
          { path: path.join(rootUri.fsPath, 'backend') },
          { path: path.join(rootUri.fsPath, 'backend', 'api') },
          { path: path.join(rootUri.fsPath, 'backend', 'workers') },
          { path: path.join(rootUri.fsPath, 'tests') },
          { path: path.join(rootUri.fsPath, 'tests', 'integration') }
        ]
      }
    };
  }

  // Mock file system for testing
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const content = this.fileSystem.get(uri.fsPath);
    if (!content) {
      throw new Error('File not found');
    }
    return new TextEncoder().encode(content);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    const textContent = new TextDecoder().decode(content);
    this.fileSystem.set(uri.fsPath, textContent);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const content = this.fileSystem.get(uri.fsPath);
    if (!content) {
      throw new Error('File not found');
    }
    return {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: content.length
    };
  }

  getGlobalConfig(): GlobalConfig | null {
    return this.globalConfig;
  }

  getFolderConfig(path: string): FolderConfig | null {
    return this.folderConfigs.get(path) || null;
  }

  reset() {
    this.globalConfig = null;
    this.folderConfigs.clear();
    this.fileSystem.clear();
  }
}

suite('Configuration Inheritance and Merging Tests', () => {
  let configManager: DatabaseConfigManager;
  let mockWorkspaceManager: MockFileSystemWorkspaceManager;
  let testRootUri: vscode.Uri;

  // Mock vscode.workspace.fs for testing
  const originalFs = vscode.workspace.fs;

  setup(() => {
    mockWorkspaceManager = new MockFileSystemWorkspaceManager();
    configManager = new DatabaseConfigManager(mockWorkspaceManager);
    testRootUri = vscode.Uri.file('/test/workspace');
    configManager.setRootUri(testRootUri);

    // Mock vscode.workspace.fs using Object.defineProperty
    Object.defineProperty(vscode.workspace, 'fs', {
      value: mockWorkspaceManager,
      writable: true,
      configurable: true
    });
  });

  teardown(() => {
    mockWorkspaceManager.reset();
    // Restore original fs
    Object.defineProperty(vscode.workspace, 'fs', {
      value: originalFs,
      writable: true,
      configurable: true
    });
  });

  suite('Basic Inheritance Scenarios', () => {
    test('should inherit global configuration when no folder config exists', async () => {
      // Set up global configuration
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-db.company.com',
          port: 3306,
          database: 'global_app',
          username: 'global_user',
          password: 'global_pass'
        },
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'global-redis.company.com',
          port: 6379
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Resolve configuration for a folder without specific config
      const folderPath = path.join(testRootUri.fsPath, 'frontend');
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // Should inherit global configuration
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'global-db.company.com');
      assert.ok(resolvedConfig.redis);
      assert.strictEqual(resolvedConfig.redis?.host, 'global-redis.company.com');
    });

    test('should override global configuration with folder-specific config', async () => {
      // Set up global configuration
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-db.company.com',
          port: 3306,
          database: 'global_app',
          username: 'global_user',
          password: 'global_pass'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Set up folder-specific configuration
      const folderPath = path.join(testRootUri.fsPath, 'backend');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'backend-mysql',
          name: 'Backend MySQL',
          type: 'mysql',
          host: 'backend-db.company.com',
          port: 3307,
          database: 'backend_app',
          username: 'backend_user',
          password: 'backend_pass'
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      // Resolve configuration for the folder
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // Should use folder-specific configuration
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'backend-db.company.com');
      assert.strictEqual(resolvedConfig.mysql?.port, 3307);
      assert.strictEqual(resolvedConfig.mysql?.database, 'backend_app');
    });

    test('should merge partial folder configuration with global configuration', async () => {
      // Set up global configuration with all database types
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-db.company.com',
          port: 3306,
          database: 'global_app',
          username: 'global_user',
          password: 'global_pass'
        },
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'global-redis.company.com',
          port: 6379
        },
        clickhouse: {
          id: 'global-clickhouse',
          name: 'Global ClickHouse',
          type: 'clickhouse',
          host: 'global-clickhouse.company.com',
          port: 8123,
          database: 'global_analytics',
          username: 'global_analyst'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Set up folder configuration that only overrides MySQL
      const folderPath = path.join(testRootUri.fsPath, 'tests');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'test-db.company.com',
          port: 3306,
          database: 'test_app',
          username: 'test_user',
          password: 'test_pass'
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      // Resolve configuration for the folder
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // MySQL should be overridden, Redis and ClickHouse should be inherited
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'test-db.company.com');
      assert.strictEqual(resolvedConfig.mysql?.database, 'test_app');

      assert.ok(resolvedConfig.redis);
      assert.strictEqual(resolvedConfig.redis?.host, 'global-redis.company.com');

      assert.ok(resolvedConfig.clickhouse);
      assert.strictEqual(resolvedConfig.clickhouse?.host, 'global-clickhouse.company.com');
    });
  });

  suite('Complex Inheritance Scenarios', () => {
    test('should handle multiple database types with different inheritance patterns', async () => {
      // Global config with all three database types
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-mysql.com',
          port: 3306,
          database: 'global_db',
          username: 'global_user',
          password: 'global_pass',
          timeout: 30000
        },
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'global-redis.com',
          port: 6379,
          timeout: 5000
        },
        clickhouse: {
          id: 'global-clickhouse',
          name: 'Global ClickHouse',
          type: 'clickhouse',
          host: 'global-clickhouse.com',
          port: 8123,
          database: 'global_analytics',
          username: 'global_analyst',
          timeout: 60000
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Folder config that overrides some fields but not others
      const folderPath = path.join(testRootUri.fsPath, 'backend', 'api');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'api-mysql',
          name: 'API MySQL',
          type: 'mysql',
          host: 'api-mysql.com',
          port: 3307,
          database: 'api_db',
          username: 'api_user'
          // Note: password and timeout not specified, should inherit
        },
        redis: {
          id: 'api-redis',
          name: 'API Redis',
          type: 'redis',
          host: 'api-redis.com',
          port: 6380
          // Note: timeout not specified, should inherit
        }
        // Note: ClickHouse not specified, should inherit entirely
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // MySQL should be merged (folder overrides + global defaults)
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'api-mysql.com');
      assert.strictEqual(resolvedConfig.mysql?.port, 3307);
      assert.strictEqual(resolvedConfig.mysql?.database, 'api_db');
      assert.strictEqual(resolvedConfig.mysql?.username, 'api_user');
      assert.strictEqual(resolvedConfig.mysql?.password, 'global_pass'); // Inherited
      assert.strictEqual(resolvedConfig.mysql?.timeout, 30000); // Inherited

      // Redis should be merged
      assert.ok(resolvedConfig.redis);
      assert.strictEqual(resolvedConfig.redis?.host, 'api-redis.com');
      assert.strictEqual(resolvedConfig.redis?.port, 6380);
      assert.strictEqual(resolvedConfig.redis?.timeout, 5000); // Inherited

      // ClickHouse should be entirely inherited
      assert.ok(resolvedConfig.clickhouse);
      assert.strictEqual(resolvedConfig.clickhouse?.host, 'global-clickhouse.com');
      assert.strictEqual(resolvedConfig.clickhouse?.port, 8123);
      assert.strictEqual(resolvedConfig.clickhouse?.database, 'global_analytics');
    });

    test('should handle configuration inheritance with empty global config', async () => {
      // No global configuration set
      const folderPath = path.join(testRootUri.fsPath, 'frontend');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'frontend-mysql',
          name: 'Frontend MySQL',
          type: 'mysql',
          host: 'frontend-db.com',
          port: 3306,
          database: 'frontend_db',
          username: 'frontend_user'
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // Should only have folder configuration
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'frontend-db.com');
      assert.strictEqual(resolvedConfig.redis, undefined);
      assert.strictEqual(resolvedConfig.clickhouse, undefined);
    });

    test('should handle configuration inheritance with empty folder config', async () => {
      const globalConfig: DatabaseConfigSet = {
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'global-redis.com',
          port: 6379
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Set empty folder config
      const folderPath = path.join(testRootUri.fsPath, 'backend');
      await configManager.setFolderConfig(folderPath, {});

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // Should inherit global configuration
      assert.ok(resolvedConfig.redis);
      assert.strictEqual(resolvedConfig.redis?.host, 'global-redis.com');
    });
  });

  suite('Configuration Merging Logic', () => {
    test('should merge configuration fields correctly', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-host',
          port: 3306,
          database: 'global_db',
          username: 'global_user',
          password: 'global_pass',
          timeout: 30000,
          maxConnections: 10,
          ssl: false,
          description: 'Global MySQL configuration'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      const folderPath = path.join(testRootUri.fsPath, 'backend');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'backend-mysql',
          name: 'Backend MySQL',
          type: 'mysql',
          host: 'backend-host',
          port: 3307,
          database: 'backend_db',
          ssl: true
          // Other fields should be inherited from global
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      assert.ok(resolvedConfig.mysql);
      
      // Overridden fields
      assert.strictEqual(resolvedConfig.mysql?.id, 'backend-mysql');
      assert.strictEqual(resolvedConfig.mysql?.name, 'Backend MySQL');
      assert.strictEqual(resolvedConfig.mysql?.host, 'backend-host');
      assert.strictEqual(resolvedConfig.mysql?.port, 3307);
      assert.strictEqual(resolvedConfig.mysql?.database, 'backend_db');
      assert.strictEqual(resolvedConfig.mysql?.ssl, true);
      
      // Inherited fields
      assert.strictEqual(resolvedConfig.mysql?.username, 'global_user');
      assert.strictEqual(resolvedConfig.mysql?.password, 'global_pass');
      assert.strictEqual(resolvedConfig.mysql?.timeout, 30000);
      assert.strictEqual(resolvedConfig.mysql?.maxConnections, 10);
      assert.strictEqual(resolvedConfig.mysql?.description, 'Global MySQL configuration');
    });

    test('should handle null and undefined values in merging', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-host',
          port: 3306,
          database: 'global_db',
          username: 'global_user',
          password: 'global_pass'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      const folderPath = path.join(testRootUri.fsPath, 'backend');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'backend-mysql',
          name: 'Backend MySQL',
          type: 'mysql',
          host: 'backend-host',
          port: 3307,
          database: 'backend_db',
          username: 'backend_user',
          password: undefined as any // Explicitly undefined
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'backend-host');
      assert.strictEqual(resolvedConfig.mysql?.username, 'backend_user');
      // Undefined password should still override global password
      assert.strictEqual(resolvedConfig.mysql?.password, undefined);
    });

    test('should preserve configuration object references correctly', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-host',
          port: 3306,
          database: 'global_db',
          username: 'global_user'
        },
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'global-redis',
          port: 6379
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      const folderPath = path.join(testRootUri.fsPath, 'backend');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'backend-mysql',
          name: 'Backend MySQL',
          type: 'mysql',
          host: 'backend-host',
          port: 3307,
          database: 'backend_db',
          username: 'backend_user'
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // MySQL should be merged, Redis should be inherited as-is
      assert.ok(resolvedConfig.mysql);
      assert.ok(resolvedConfig.redis);
      
      // Verify that the configurations are properly merged/inherited
      assert.strictEqual(resolvedConfig.mysql?.host, 'backend-host');
      assert.strictEqual(resolvedConfig.redis?.host, 'global-redis');
    });
  });

  suite('Inheritance Chain Building', () => {
    test('should build correct inheritance chain for root path', async () => {
      const context = await configManager.getConfigurationContext(testRootUri.fsPath);
      
      assert.strictEqual(context.inheritanceChain.length, 1);
      assert.ok(context.inheritanceChain.includes(testRootUri.fsPath));
    });

    test('should build correct inheritance chain for folder path', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'backend');
      const context = await configManager.getConfigurationContext(folderPath);
      
      assert.strictEqual(context.inheritanceChain.length, 2);
      assert.ok(context.inheritanceChain.includes(testRootUri.fsPath));
      assert.ok(context.inheritanceChain.includes(folderPath));
    });

    test('should build correct inheritance chain for nested folder path', async () => {
      const nestedFolderPath = path.join(testRootUri.fsPath, 'backend', 'api');
      const context = await configManager.getConfigurationContext(nestedFolderPath);
      
      assert.strictEqual(context.inheritanceChain.length, 2);
      assert.ok(context.inheritanceChain.includes(testRootUri.fsPath));
      assert.ok(context.inheritanceChain.includes(nestedFolderPath));
    });
  });

  suite('Cache Behavior with Inheritance', () => {
    test('should cache resolved configurations correctly', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'global-host',
          port: 3306,
          database: 'global_db',
          username: 'global_user'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      const folderPath = path.join(testRootUri.fsPath, 'backend');
      
      // First resolution should populate cache
      const firstResolve = await configManager.resolveConfig(folderPath);
      assert.strictEqual(configManager.hasCachedConfig(folderPath), true);
      
      // Second resolution should use cache
      const secondResolve = await configManager.resolveConfig(folderPath);
      assert.deepStrictEqual(secondResolve, firstResolve);
    });

    test('should invalidate cache when parent configuration changes', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'backend');
      
      // Populate cache
      await configManager.resolveConfig(folderPath);
      assert.strictEqual(configManager.hasCachedConfig(folderPath), true);
      
      // Change global configuration
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'new-global-mysql',
          name: 'New Global MySQL',
          type: 'mysql',
          host: 'new-global-host',
          port: 3306,
          database: 'new_global_db',
          username: 'new_global_user'
        }
      };

      await configManager.setGlobalConfig(globalConfig);
      
      // Cache should be invalidated
      assert.strictEqual(configManager.hasCachedConfig(folderPath), false);
    });

    test('should invalidate cache for specific folder and children', async () => {
      const parentPath = path.join(testRootUri.fsPath, 'backend');
      const childPath = path.join(testRootUri.fsPath, 'backend', 'api');
      const unrelatedPath = path.join(testRootUri.fsPath, 'frontend');
      
      // Populate cache for all paths
      await configManager.resolveConfig(parentPath);
      await configManager.resolveConfig(childPath);
      await configManager.resolveConfig(unrelatedPath);
      
      // Verify cache is populated
      assert.strictEqual(configManager.hasCachedConfig(parentPath), true);
      assert.strictEqual(configManager.hasCachedConfig(childPath), true);
      assert.strictEqual(configManager.hasCachedConfig(unrelatedPath), true);
      
      // Set folder configuration for parent (this should invalidate cache)
      const folderConfig: DatabaseConfigSet = {
        redis: {
          id: 'backend-redis',
          name: 'Backend Redis',
          type: 'redis',
          host: 'backend-redis',
          port: 6379
        }
      };

      await configManager.setFolderConfig(parentPath, folderConfig);
      
      // Parent and child cache should be invalidated, unrelated should remain
      assert.strictEqual(configManager.hasCachedConfig(parentPath), false);
      assert.strictEqual(configManager.hasCachedConfig(childPath), false);
      assert.strictEqual(configManager.hasCachedConfig(unrelatedPath), true);
    });
  });
});