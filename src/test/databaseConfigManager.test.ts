import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig, DatabaseConfigSet, GlobalConfig, FolderConfig } from '../workspaceTypes';

// Mock WorkspaceManager for testing
class MockWorkspaceManager {
  private globalConfig: any = null;
  private folderConfigs = new Map<string, any>();
  private shouldFailOperations = false;
  private operationDelay = 0;

  async updateGlobalConfig(rootUri: vscode.Uri, config: any) {
    if (this.shouldFailOperations) {
      return { success: false, error: 'Mock operation failed' };
    }
    
    if (this.operationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.operationDelay));
    }
    
    this.globalConfig = { ...config };
    return { success: true };
  }

  async updateFolderConfig(folderUri: vscode.Uri, config: any) {
    if (this.shouldFailOperations) {
      return { success: false, error: 'Mock operation failed' };
    }
    
    if (this.operationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.operationDelay));
    }
    
    this.folderConfigs.set(folderUri.fsPath, config);
    return { success: true };
  }

  async getWorkspaceTree(rootUri: vscode.Uri) {
    if (this.shouldFailOperations) {
      return { success: false, error: 'Mock operation failed' };
    }
    
    return {
      success: true,
      data: {
        rootPath: rootUri.fsPath,
        folders: [
          { path: path.join(rootUri.fsPath, 'folder1') },
          { path: path.join(rootUri.fsPath, 'folder2') },
          { path: path.join(rootUri.fsPath, 'nested', 'folder3') }
        ]
      }
    };
  }

  // Helper methods for testing
  getGlobalConfig() {
    return this.globalConfig;
  }

  getFolderConfig(path: string) {
    return this.folderConfigs.get(path);
  }

  setFailOperations(shouldFail: boolean) {
    this.shouldFailOperations = shouldFail;
  }

  setOperationDelay(delay: number) {
    this.operationDelay = delay;
  }

  reset() {
    this.globalConfig = null;
    this.folderConfigs.clear();
    this.shouldFailOperations = false;
    this.operationDelay = 0;
  }
}

suite('DatabaseConfigManager Tests', () => {
  let configManager: DatabaseConfigManager;
  let mockWorkspaceManager: MockWorkspaceManager;
  let testRootUri: vscode.Uri;

  setup(() => {
    mockWorkspaceManager = new MockWorkspaceManager();
    configManager = new DatabaseConfigManager(mockWorkspaceManager);
    testRootUri = vscode.Uri.file('/test/workspace');
    configManager.setRootUri(testRootUri);
  });

  teardown(() => {
    mockWorkspaceManager.reset();
  });

  suite('Configuration Validation', () => {
    test('should validate MySQL configuration correctly', () => {
      const validMysqlConfig: DatabaseConfig = {
        id: 'test-mysql',
        name: 'Test MySQL',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'root',
        password: 'password'
      };

      assert.strictEqual(configManager.validateConfig(validMysqlConfig), null);
    });

    test('should validate Redis configuration correctly', () => {
      const validRedisConfig: DatabaseConfig = {
        id: 'test-redis',
        name: 'Test Redis',
        type: 'redis',
        host: 'localhost',
        port: 6379
      };

      assert.strictEqual(configManager.validateConfig(validRedisConfig), null);
    });

    test('should validate ClickHouse configuration correctly', () => {
      const validClickHouseConfig: DatabaseConfig = {
        id: 'test-clickhouse',
        name: 'Test ClickHouse',
        type: 'clickhouse',
        host: 'localhost',
        port: 8123,
        database: 'default',
        username: 'default'
      };

      assert.strictEqual(configManager.validateConfig(validClickHouseConfig), null);
    });

    test('should reject configuration with missing required fields', () => {
      const invalidConfig: DatabaseConfig = {
        id: 'invalid',
        name: 'Invalid',
        type: 'mysql',
        host: '',
        port: 0,
        database: '',
        username: ''
      };

      const error = configManager.validateConfig(invalidConfig);
      assert.notStrictEqual(error, null);
      assert.strictEqual(error?.type, 'validation');
      assert.ok(error?.message.includes('Host and port are required'));
    });

    test('should reject configuration with invalid port range', () => {
      const invalidPortConfig: DatabaseConfig = {
        id: 'invalid-port',
        name: 'Invalid Port',
        type: 'mysql',
        host: 'localhost',
        port: 70000,
        database: 'test',
        username: 'root'
      };

      const error = configManager.validateConfig(invalidPortConfig);
      assert.notStrictEqual(error, null);
      assert.strictEqual(error?.type, 'validation');
      assert.ok(error?.message.includes('Port must be between 1 and 65535'));
    });

    test('should reject MySQL configuration without database and username', () => {
      const invalidMysqlConfig: DatabaseConfig = {
        id: 'invalid-mysql',
        name: 'Invalid MySQL',
        type: 'mysql',
        host: 'localhost',
        port: 3306
      };

      const error = configManager.validateConfig(invalidMysqlConfig);
      assert.notStrictEqual(error, null);
      assert.strictEqual(error?.type, 'validation');
      assert.ok(error?.message.includes('Database and username are required for MySQL'));
    });

    test('should reject ClickHouse configuration without database and username', () => {
      const invalidClickHouseConfig: DatabaseConfig = {
        id: 'invalid-clickhouse',
        name: 'Invalid ClickHouse',
        type: 'clickhouse',
        host: 'localhost',
        port: 8123
      };

      const error = configManager.validateConfig(invalidClickHouseConfig);
      assert.notStrictEqual(error, null);
      assert.strictEqual(error?.type, 'validation');
      assert.ok(error?.message.includes('Database and username are required for ClickHouse'));
    });
  });

  suite('Cache Management', () => {
    test('should handle cache operations correctly', async () => {
      const testPath = '/test/folder';
      
      // Initially no cache
      assert.strictEqual(configManager.hasCachedConfig(testPath), false);
      
      // Cache should be populated after resolving config
      await configManager.resolveConfig(testPath);
      assert.strictEqual(configManager.hasCachedConfig(testPath), true);
      
      // Cache should be cleared after invalidation
      configManager.invalidateCache(testPath);
      assert.strictEqual(configManager.hasCachedConfig(testPath), false);
    });

    test('should provide cache statistics', () => {
      const stats = configManager.getCacheStats();
      assert.strictEqual(typeof stats.size, 'number');
      assert.strictEqual(Array.isArray(stats.keys), true);
    });

    test('should clear entire cache when no path specified', async () => {
      const testPath1 = '/test/folder1';
      const testPath2 = '/test/folder2';
      
      // Populate cache with multiple entries
      await configManager.resolveConfig(testPath1);
      await configManager.resolveConfig(testPath2);
      
      assert.strictEqual(configManager.hasCachedConfig(testPath1), true);
      assert.strictEqual(configManager.hasCachedConfig(testPath2), true);
      
      // Clear entire cache
      configManager.invalidateCache();
      
      assert.strictEqual(configManager.hasCachedConfig(testPath1), false);
      assert.strictEqual(configManager.hasCachedConfig(testPath2), false);
    });

    test('should clear cache for specific path and children', async () => {
      const parentPath = '/test/parent';
      const childPath = '/test/parent/child';
      const unrelatedPath = '/test/other';
      
      // Populate cache
      await configManager.resolveConfig(parentPath);
      await configManager.resolveConfig(childPath);
      await configManager.resolveConfig(unrelatedPath);
      
      // Clear cache for parent path
      configManager.invalidateCache(parentPath);
      
      // Parent and child should be cleared, unrelated should remain
      assert.strictEqual(configManager.hasCachedConfig(parentPath), false);
      assert.strictEqual(configManager.hasCachedConfig(childPath), false);
      assert.strictEqual(configManager.hasCachedConfig(unrelatedPath), true);
    });

    test('should handle cache key normalization', async () => {
      const windowsPath = 'C:\\test\\folder';
      const normalizedPath = 'c:/test/folder';
      
      await configManager.resolveConfig(windowsPath);
      
      // Windows path should be cached
      assert.strictEqual(configManager.hasCachedConfig(windowsPath), true);
      // Normalized path should also be found due to cache key normalization
      assert.strictEqual(configManager.hasCachedConfig(normalizedPath), true);
    });
  });

  suite('Configuration Resolution', () => {
    test('should resolve configuration for root path', async () => {
      const config = await configManager.resolveConfig(testRootUri.fsPath);
      
      assert.strictEqual(typeof config, 'object');
      assert.strictEqual(config !== null, true);
      assert.strictEqual(Array.isArray(config), false);
    });

    test('should resolve configuration for folder path', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'subfolder');
      const config = await configManager.resolveConfig(folderPath);
      
      assert.strictEqual(typeof config, 'object');
      assert.strictEqual(config !== null, true);
      assert.strictEqual(Array.isArray(config), false);
    });

    test('should return consistent results for same path', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'subfolder');
      
      const firstConfig = await configManager.resolveConfig(folderPath);
      const secondConfig = await configManager.resolveConfig(folderPath);
      
      assert.deepStrictEqual(secondConfig, firstConfig);
    });

    test('should handle different folder paths independently', async () => {
      const folderPath1 = path.join(testRootUri.fsPath, 'folder1');
      const folderPath2 = path.join(testRootUri.fsPath, 'folder2');
      
      const config1 = await configManager.resolveConfig(folderPath1);
      const config2 = await configManager.resolveConfig(folderPath2);
      
      assert.strictEqual(typeof config1, 'object');
      assert.strictEqual(typeof config2, 'object');
      assert.strictEqual(config1 !== null, true);
      assert.strictEqual(config2 !== null, true);
    });

    test('should get configuration for specific database type', async () => {
      const testPath = testRootUri.fsPath;
      
      // Should return null when no configuration exists
      const mysqlConfig = await configManager.getConfigForPath(testPath, 'mysql');
      assert.strictEqual(mysqlConfig, null);
      
      const redisConfig = await configManager.getConfigForPath(testPath, 'redis');
      assert.strictEqual(redisConfig, null);
      
      const clickhouseConfig = await configManager.getConfigForPath(testPath, 'clickhouse');
      assert.strictEqual(clickhouseConfig, null);
    });
  });

  suite('Configuration Context', () => {
    test('should provide configuration context for global path', async () => {
      const context = await configManager.getConfigurationContext(testRootUri.fsPath);
      
      assert.strictEqual(context.path, testRootUri.fsPath);
      assert.strictEqual(context.level, 'global');
      assert.strictEqual(typeof context.resolvedConfig, 'object');
      assert.strictEqual(Array.isArray(context.inheritanceChain), true);
      assert.ok(context.inheritanceChain.length >= 1);
    });

    test('should provide configuration context for folder path', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'subfolder');
      const context = await configManager.getConfigurationContext(folderPath);
      
      assert.strictEqual(context.path, folderPath);
      assert.strictEqual(context.level, 'folder');
      assert.strictEqual(typeof context.resolvedConfig, 'object');
      assert.strictEqual(Array.isArray(context.inheritanceChain), true);
      assert.ok(context.inheritanceChain.length >= 1);
    });

    test('should build inheritance chain correctly', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'subfolder');
      const context = await configManager.getConfigurationContext(folderPath);
      
      // Should include both global and folder levels
      assert.ok(context.inheritanceChain.includes(testRootUri.fsPath));
      assert.ok(context.inheritanceChain.includes(folderPath));
    });
  });

  suite('Configuration Persistence', () => {
    test('should set global configuration successfully', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'global-mysql',
          name: 'Global MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'root',
          password: 'password'
        }
      };

      await configManager.setGlobalConfig(globalConfig);
      
      const savedConfig = mockWorkspaceManager.getGlobalConfig();
      assert.notStrictEqual(savedConfig, null);
      assert.ok(savedConfig.databases);
      assert.ok(savedConfig.databases.mysql);
      assert.strictEqual(savedConfig.databases.mysql.host, 'localhost');
    });

    test('should set folder configuration successfully', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'test-folder');
      const folderConfig: DatabaseConfigSet = {
        redis: {
          id: 'folder-redis',
          name: 'Folder Redis',
          type: 'redis',
          host: 'redis-server',
          port: 6379
        }
      };

      await configManager.setFolderConfig(folderPath, folderConfig);
      
      const savedConfig = mockWorkspaceManager.getFolderConfig(folderPath);
      assert.notStrictEqual(savedConfig, null);
      assert.ok(savedConfig.databases);
      assert.ok(savedConfig.databases.redis);
      assert.strictEqual(savedConfig.databases.redis.host, 'redis-server');
    });

    test('should handle configuration persistence errors', async () => {
      mockWorkspaceManager.setFailOperations(true);
      
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'root'
        }
      };

      try {
        await configManager.setGlobalConfig(globalConfig);
        assert.fail('Expected error was not thrown');
      } catch (error: any) {
        assert.ok(error.message.includes('Failed to set global config'));
      }
    });

    test('should handle folder configuration persistence errors', async () => {
      mockWorkspaceManager.setFailOperations(true);
      
      const folderPath = path.join(testRootUri.fsPath, 'test-folder');
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

    test('should invalidate cache after configuration changes', async () => {
      const testPath = testRootUri.fsPath;
      
      // Populate cache
      await configManager.resolveConfig(testPath);
      assert.strictEqual(configManager.hasCachedConfig(testPath), true);
      
      // Set global config should invalidate cache
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'root'
        }
      };
      
      await configManager.setGlobalConfig(globalConfig);
      assert.strictEqual(configManager.hasCachedConfig(testPath), false);
    });
  });

  suite('Error Handling and Fallbacks', () => {
    test('should handle missing workspace root', async () => {
      const configManagerWithoutRoot = new DatabaseConfigManager(mockWorkspaceManager);
      
      try {
        await configManagerWithoutRoot.setGlobalConfig({});
        assert.fail('Expected error was not thrown');
      } catch (error: any) {
        assert.ok(error.message.includes('No workspace root set'));
      }
    });

    test('should return empty config on resolution errors', async () => {
      // Force an error in workspace manager
      mockWorkspaceManager.setFailOperations(true);
      
      const config = await configManager.resolveConfig('/test/path');
      
      // Should return empty config instead of throwing
      assert.strictEqual(typeof config, 'object');
      assert.strictEqual(Object.keys(config).length, 0);
    });

    test('should handle preload configuration errors gracefully', async () => {
      mockWorkspaceManager.setFailOperations(true);
      
      // Should not throw error
      await configManager.preloadConfigurations();
      
      // Test passes if no error is thrown
      assert.ok(true);
    });

    test('should handle reload configurations', async () => {
      const testPath = testRootUri.fsPath;
      
      // Populate cache
      await configManager.resolveConfig(testPath);
      assert.strictEqual(configManager.hasCachedConfig(testPath), true);
      
      // Reload should clear cache and repopulate
      await configManager.reloadConfigurations();
      
      // Cache should be repopulated after reload
      assert.strictEqual(configManager.hasCachedConfig(testPath), true);
    });
  });

  suite('Configuration Change Callbacks', () => {
    test('should trigger callback on global configuration change', async () => {
      let callbackTriggered = false;
      
      configManager.setOnConfigurationChanged(async () => {
        callbackTriggered = true;
      });
      
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'root'
        }
      };
      
      await configManager.setGlobalConfig(globalConfig);
      assert.strictEqual(callbackTriggered, true);
    });

    test('should trigger callback on folder configuration change', async () => {
      let callbackTriggered = false;
      
      configManager.setOnConfigurationChanged(async () => {
        callbackTriggered = true;
      });
      
      const folderPath = path.join(testRootUri.fsPath, 'test-folder');
      const folderConfig: DatabaseConfigSet = {
        redis: {
          id: 'test-redis',
          name: 'Test Redis',
          type: 'redis',
          host: 'localhost',
          port: 6379
        }
      };
      
      await configManager.setFolderConfig(folderPath, folderConfig);
      assert.strictEqual(callbackTriggered, true);
    });
  });

  suite('Performance and Optimization', () => {
    test('should handle concurrent configuration resolution', async () => {
      const paths = [
        path.join(testRootUri.fsPath, 'folder1'),
        path.join(testRootUri.fsPath, 'folder2'),
        path.join(testRootUri.fsPath, 'folder3')
      ];
      
      // Resolve configurations concurrently
      const promises = paths.map(p => configManager.resolveConfig(p));
      const results = await Promise.all(promises);
      
      // All should succeed
      assert.strictEqual(results.length, 3);
      results.forEach(config => {
        assert.strictEqual(typeof config, 'object');
        assert.strictEqual(config !== null, true);
      });
    });

    test('should handle preload with multiple folders', async () => {
      // Should not throw error even with multiple folders
      await configManager.preloadConfigurations();
      
      // Verify cache is populated for root
      assert.strictEqual(configManager.hasCachedConfig(testRootUri.fsPath), true);
    });

    test('should handle operation delays gracefully', async () => {
      mockWorkspaceManager.setOperationDelay(100);
      
      const startTime = Date.now();
      
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'test-mysql',
          name: 'Test MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'root'
        }
      };
      
      await configManager.setGlobalConfig(globalConfig);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have taken at least the delay time
      assert.ok(duration >= 100);
    });
  });
});