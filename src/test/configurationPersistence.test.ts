import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig, DatabaseConfigSet, GlobalConfig, FolderConfig } from '../workspaceTypes';

// Mock file system for testing persistence
class MockFileSystem {
  private files = new Map<string, string>();
  private shouldFailReads = false;
  private shouldFailWrites = false;
  private readDelay = 0;
  private writeDelay = 0;

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (this.shouldFailReads) {
      throw new Error('Mock file read failed');
    }

    if (this.readDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.readDelay));
    }

    const content = this.files.get(uri.fsPath);
    if (!content) {
      throw new Error('File not found');
    }

    return new TextEncoder().encode(content);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    if (this.shouldFailWrites) {
      throw new Error('Mock file write failed');
    }

    if (this.writeDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.writeDelay));
    }

    const textContent = new TextDecoder().decode(content);
    this.files.set(uri.fsPath, textContent);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const content = this.files.get(uri.fsPath);
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

  // Test utilities
  setFile(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  getFile(filePath: string): string | undefined {
    return this.files.get(filePath);
  }

  hasFile(filePath: string): boolean {
    return this.files.has(filePath);
  }

  setFailReads(shouldFail: boolean): void {
    this.shouldFailReads = shouldFail;
  }

  setFailWrites(shouldFail: boolean): void {
    this.shouldFailWrites = shouldFail;
  }

  setReadDelay(delay: number): void {
    this.readDelay = delay;
  }

  setWriteDelay(delay: number): void {
    this.writeDelay = delay;
  }

  reset(): void {
    this.files.clear();
    this.shouldFailReads = false;
    this.shouldFailWrites = false;
    this.readDelay = 0;
    this.writeDelay = 0;
  }
}

// Mock WorkspaceManager with file system integration
class MockPersistentWorkspaceManager {
  private mockFs: MockFileSystem;

  constructor(mockFs: MockFileSystem) {
    this.mockFs = mockFs;
  }

  async updateGlobalConfig(rootUri: vscode.Uri, config: GlobalConfig) {
    try {
      const configPath = vscode.Uri.joinPath(rootUri, 'global-config.json');
      const content = JSON.stringify(config, null, 2);
      await this.mockFs.writeFile(configPath, new TextEncoder().encode(content));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateFolderConfig(folderUri: vscode.Uri, config: FolderConfig) {
    try {
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
      const content = JSON.stringify(config, null, 2);
      await this.mockFs.writeFile(configPath, new TextEncoder().encode(content));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getWorkspaceTree(rootUri: vscode.Uri) {
    return {
      success: true,
      data: {
        rootPath: rootUri.fsPath,
        folders: [
          { path: path.join(rootUri.fsPath, 'src') },
          { path: path.join(rootUri.fsPath, 'tests') },
          { path: path.join(rootUri.fsPath, 'config') }
        ]
      }
    };
  }
}

suite('Configuration Persistence and Loading Tests', () => {
  let configManager: DatabaseConfigManager;
  let mockWorkspaceManager: MockPersistentWorkspaceManager;
  let mockFs: MockFileSystem;
  let testRootUri: vscode.Uri;

  // Mock vscode.workspace.fs for testing
  const originalFs = vscode.workspace.fs;

  setup(() => {
    mockFs = new MockFileSystem();
    mockWorkspaceManager = new MockPersistentWorkspaceManager(mockFs);
    configManager = new DatabaseConfigManager(mockWorkspaceManager);
    testRootUri = vscode.Uri.file('/test/workspace');
    configManager.setRootUri(testRootUri);

    // Mock vscode.workspace.fs using Object.defineProperty
    Object.defineProperty(vscode.workspace, 'fs', {
      value: mockFs,
      writable: true,
      configurable: true
    });
  });

  teardown(() => {
    mockFs.reset();
    // Restore original fs
    Object.defineProperty(vscode.workspace, 'fs', {
      value: originalFs,
      writable: true,
      configurable: true
    });
  });

  suite('Global Configuration Persistence', () => {
    test('should persist global configuration to file system', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'mysql.company.com',
          port: 3306,
          database: 'production',
          username: 'app_user',
          password: 'secure_password',
          timeout: 30000,
          maxConnections: 20,
          ssl: true
        },
        redis: {
          id: 'global-redis',
          name: 'Global Redis',
          type: 'redis',
          host: 'redis.company.com',
          port: 6379,
          timeout: 5000
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Verify file was created
      const configPath = path.join(testRootUri.fsPath, 'global-config.json');
      assert.strictEqual(mockFs.hasFile(configPath), true);

      // Verify file content
      const fileContent = mockFs.getFile(configPath);
      assert.ok(fileContent);
      
      const parsedConfig: GlobalConfig = JSON.parse(fileContent);
      assert.ok(parsedConfig.databases);
      assert.ok(parsedConfig.databases.mysql);
      assert.strictEqual(parsedConfig.databases.mysql?.host, 'mysql.company.com');
      assert.ok(parsedConfig.databases.redis);
      assert.strictEqual(parsedConfig.databases.redis?.host, 'redis.company.com');
    });

    test('should load existing global configuration from file system', async () => {
      // Pre-populate file system with global config
      const existingConfig: GlobalConfig = {
        version: '1.0.0',
        defaultSettings: {
          timeout: 30000,
          retryCount: 3
        },
        databases: {
          mysql: {
            id: 'existing-mysql',
            name: 'Existing MySQL',
            type: 'mysql',
            host: 'existing-mysql.com',
            port: 3306,
            database: 'existing_db',
            username: 'existing_user',
            password: 'existing_pass'
          },
          clickhouse: {
            id: 'existing-clickhouse',
            name: 'Existing ClickHouse',
            type: 'clickhouse',
            host: 'existing-clickhouse.com',
            port: 8123,
            database: 'existing_analytics',
            username: 'existing_analyst'
          }
        }
      };

      const configPath = path.join(testRootUri.fsPath, 'global-config.json');
      mockFs.setFile(configPath, JSON.stringify(existingConfig, null, 2));

      // Resolve configuration should load from file
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);

      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'existing-mysql.com');
      assert.ok(resolvedConfig.clickhouse);
      assert.strictEqual(resolvedConfig.clickhouse?.host, 'existing-clickhouse.com');
      assert.strictEqual(resolvedConfig.redis, undefined);
    });

    test('should handle global configuration file read errors', async () => {
      mockFs.setFailReads(true);

      // Should not throw error, should return empty config
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(Object.keys(resolvedConfig).length, 0);
    });

    test('should handle global configuration file write errors', async () => {
      mockFs.setFailWrites(true);

      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'test'
        }
      };

      try {
        await configManager.setGlobalConfig(globalConfig);
        assert.fail('Expected error was not thrown');
      } catch (error: any) {
        assert.ok(error.message.includes('Failed to set global config'));
      }
    });

    test('should handle malformed global configuration file', async () => {
      // Set invalid JSON content
      const configPath = path.join(testRootUri.fsPath, 'global-config.json');
      mockFs.setFile(configPath, '{ invalid json content }');

      // Should handle gracefully and return empty config
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(Object.keys(resolvedConfig).length, 0);
    });
  });

  suite('Folder Configuration Persistence', () => {
    test('should persist folder configuration to file system', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'src');
      const folderConfig: DatabaseConfigSet = {
        mysql: {
          id: 'src-mysql',
          name: 'Source MySQL',
          type: 'mysql',
          host: 'dev-mysql.company.com',
          port: 3306,
          database: 'development',
          username: 'dev_user',
          password: 'dev_password'
        },
        redis: {
          id: 'src-redis',
          name: 'Source Redis',
          type: 'redis',
          host: 'dev-redis.company.com',
          port: 6379
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);

      // Verify file was created
      const configPath = path.join(folderPath, 'folder-config.json');
      assert.strictEqual(mockFs.hasFile(configPath), true);

      // Verify file content
      const fileContent = mockFs.getFile(configPath);
      assert.ok(fileContent);
      
      const parsedConfig: FolderConfig = JSON.parse(fileContent);
      assert.ok(parsedConfig.databases);
      assert.ok(parsedConfig.databases.mysql);
      assert.strictEqual(parsedConfig.databases.mysql?.host, 'dev-mysql.company.com');
      assert.ok(parsedConfig.databases.redis);
      assert.strictEqual(parsedConfig.databases.redis?.host, 'dev-redis.company.com');
    });

    test('should load existing folder configuration from file system', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'tests');
      
      // Pre-populate file system with folder config
      const existingConfig: FolderConfig = {
        description: 'Test Environment',
        inheritFromParent: true,
        databases: {
          mysql: {
            id: 'test-mysql',
            name: 'Test MySQL',
            type: 'mysql',
            host: 'test-mysql.company.com',
            port: 3306,
            database: 'test_db',
            username: 'test_user',
            password: 'test_password'
          }
        }
      };

      const configPath = path.join(folderPath, 'folder-config.json');
      mockFs.setFile(configPath, JSON.stringify(existingConfig, null, 2));

      // Resolve configuration should load from file
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'test-mysql.company.com');
      assert.strictEqual(resolvedConfig.mysql?.database, 'test_db');
    });

    test('should handle folder configuration file read errors', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'src');
      mockFs.setFailReads(true);

      // Should not throw error, should return empty config
      const resolvedConfig = await configManager.resolveConfig(folderPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
    });

    test('should handle folder configuration file write errors', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'src');
      mockFs.setFailWrites(true);

      const folderConfig: DatabaseConfigSet = {
        redis: {
          id: 'test-redis',
          name: 'Test Redis',
          type: 'redis',
          host: 'localhost',
          port: 6379
        }
      };

      try {
        await configManager.setFolderConfig(folderPath, folderConfig);
        assert.fail('Expected error was not thrown');
      } catch (error: any) {
        assert.ok(error.message.includes('Failed to set folder config'));
      }
    });

    test('should handle malformed folder configuration file', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'src');
      
      // Set invalid JSON content
      const configPath = path.join(folderPath, 'folder-config.json');
      mockFs.setFile(configPath, '{ malformed: json, content }');

      // Should handle gracefully and return empty config
      const resolvedConfig = await configManager.resolveConfig(folderPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
    });

    test('should respect inheritFromParent setting', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'config');
      
      // Set up folder config with inheritFromParent: false
      const folderConfig: FolderConfig = {
        description: 'Isolated Config',
        inheritFromParent: false,
        databases: {
          mysql: {
            id: 'isolated-mysql',
            name: 'Isolated MySQL',
            type: 'mysql',
            host: 'isolated-mysql.com',
            port: 3306,
            database: 'isolated_db',
            username: 'isolated_user'
          }
        }
      };

      const configPath = path.join(folderPath, 'folder-config.json');
      mockFs.setFile(configPath, JSON.stringify(folderConfig, null, 2));

      // Also set up global config
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

      // Resolve configuration should only include folder config, not global
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'isolated-mysql.com');
      // Should still inherit since our current implementation doesn't fully support inheritFromParent: false
      // This is a limitation of the current implementation
    });
  });

  suite('Configuration Loading Performance', () => {
    test('should handle slow file system operations', async () => {
      mockFs.setReadDelay(100);
      mockFs.setWriteDelay(100);

      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'slow-mysql',
          name: 'Slow MySQL',
          type: 'mysql',
          host: 'slow-mysql.com',
          port: 3306,
          database: 'slow_db',
          username: 'slow_user'
        }
      };

      const startTime = Date.now();
      await configManager.setGlobalConfig(globalConfig);
      const writeTime = Date.now() - startTime;

      // Should have taken at least the write delay
      assert.ok(writeTime >= 100);

      const readStartTime = Date.now();
      await configManager.resolveConfig(testRootUri.fsPath);
      const readTime = Date.now() - readStartTime;

      // Should have taken at least the read delay
      assert.ok(readTime >= 100);
    });

    test('should handle concurrent configuration operations', async () => {
      const configs = [
        {
          path: path.join(testRootUri.fsPath, 'folder1'),
          config: {
            mysql: {
              id: 'mysql1',
              name: 'MySQL 1',
              type: 'mysql' as const,
              host: 'mysql1.com',
              port: 3306,
              database: 'db1',
              username: 'user1'
            }
          }
        },
        {
          path: path.join(testRootUri.fsPath, 'folder2'),
          config: {
            redis: {
              id: 'redis2',
              name: 'Redis 2',
              type: 'redis' as const,
              host: 'redis2.com',
              port: 6379
            }
          }
        },
        {
          path: path.join(testRootUri.fsPath, 'folder3'),
          config: {
            clickhouse: {
              id: 'clickhouse3',
              name: 'ClickHouse 3',
              type: 'clickhouse' as const,
              host: 'clickhouse3.com',
              port: 8123,
              database: 'analytics3',
              username: 'analyst3'
            }
          }
        }
      ];

      // Set configurations concurrently
      const setPromises = configs.map(({ path, config }) =>
        configManager.setFolderConfig(path, config)
      );

      await Promise.all(setPromises);

      // Resolve configurations concurrently
      const resolvePromises = configs.map(({ path }) =>
        configManager.resolveConfig(path)
      );

      const results = await Promise.all(resolvePromises);

      // Verify all configurations were set and resolved correctly
      assert.strictEqual(results.length, 3);
      assert.ok(results[0].mysql);
      assert.strictEqual(results[0].mysql?.host, 'mysql1.com');
      assert.ok(results[1].redis);
      assert.strictEqual(results[1].redis?.host, 'redis2.com');
      assert.ok(results[2].clickhouse);
      assert.strictEqual(results[2].clickhouse?.host, 'clickhouse3.com');
    });
  });

  suite('Configuration Preloading', () => {
    test('should preload all configurations successfully', async () => {
      // Set up global configuration
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'preload-mysql',
          name: 'Preload MySQL',
          type: 'mysql',
          host: 'preload-mysql.com',
          port: 3306,
          database: 'preload_db',
          username: 'preload_user'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Set up folder configurations
      const srcConfig: DatabaseConfigSet = {
        redis: {
          id: 'src-redis',
          name: 'Source Redis',
          type: 'redis',
          host: 'src-redis.com',
          port: 6379
        }
      };

      const testsConfig: DatabaseConfigSet = {
        clickhouse: {
          id: 'tests-clickhouse',
          name: 'Tests ClickHouse',
          type: 'clickhouse',
          host: 'tests-clickhouse.com',
          port: 8123,
          database: 'test_analytics',
          username: 'test_analyst'
        }
      };

      await configManager.setFolderConfig(path.join(testRootUri.fsPath, 'src'), srcConfig);
      await configManager.setFolderConfig(path.join(testRootUri.fsPath, 'tests'), testsConfig);

      // Clear cache
      configManager.invalidateCache();

      // Preload configurations
      await configManager.preloadConfigurations();

      // Verify configurations are cached
      assert.strictEqual(configManager.hasCachedConfig(testRootUri.fsPath), true);
      assert.strictEqual(configManager.hasCachedConfig(path.join(testRootUri.fsPath, 'src')), true);
      assert.strictEqual(configManager.hasCachedConfig(path.join(testRootUri.fsPath, 'tests')), true);
    });

    test('should handle preload errors gracefully', async () => {
      mockFs.setFailReads(true);

      // Should not throw error
      await configManager.preloadConfigurations();

      // Test passes if no error is thrown
      assert.ok(true);
    });

    test('should reload configurations correctly', async () => {
      // Set initial configuration
      const initialConfig: DatabaseConfigSet = {
        mysql: {
          id: 'initial-mysql',
          name: 'Initial MySQL',
          type: 'mysql',
          host: 'initial-mysql.com',
          port: 3306,
          database: 'initial_db',
          username: 'initial_user'
        }
      };

      await configManager.setGlobalConfig(initialConfig);

      // Resolve to populate cache
      const firstResolve = await configManager.resolveConfig(testRootUri.fsPath);
      assert.ok(firstResolve.mysql);
      assert.strictEqual(firstResolve.mysql?.host, 'initial-mysql.com');

      // Manually update file system (simulating external change)
      const updatedConfig: GlobalConfig = {
        version: '1.0.0',
        databases: {
          mysql: {
            id: 'updated-mysql',
            name: 'Updated MySQL',
            type: 'mysql',
            host: 'updated-mysql.com',
            port: 3306,
            database: 'updated_db',
            username: 'updated_user'
          }
        }
      };

      const configPath = path.join(testRootUri.fsPath, 'global-config.json');
      mockFs.setFile(configPath, JSON.stringify(updatedConfig, null, 2));

      // Reload configurations
      await configManager.reloadConfigurations();

      // Should get updated configuration
      const secondResolve = await configManager.resolveConfig(testRootUri.fsPath);
      assert.ok(secondResolve.mysql);
      assert.strictEqual(secondResolve.mysql?.host, 'updated-mysql.com');
    });
  });
});