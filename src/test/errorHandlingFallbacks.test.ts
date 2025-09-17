import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig, DatabaseConfigSet, ConfigurationError } from '../workspaceTypes';

// Mock WorkspaceManager with various failure scenarios
class MockFailureWorkspaceManager {
  private failureMode: 'none' | 'global-read' | 'global-write' | 'folder-read' | 'folder-write' | 'workspace-tree' | 'intermittent' = 'none';
  private intermittentFailureCount = 0;
  private maxIntermittentFailures = 2;
  private configs = new Map<string, any>();

  setFailureMode(mode: 'none' | 'global-read' | 'global-write' | 'folder-read' | 'folder-write' | 'workspace-tree' | 'intermittent'): void {
    this.failureMode = mode;
    this.intermittentFailureCount = 0;
  }

  async updateGlobalConfig(rootUri: vscode.Uri, config: any) {
    if (this.failureMode === 'global-write') {
      return { success: false, error: 'Global config write failed' };
    }

    if (this.failureMode === 'intermittent' && this.intermittentFailureCount < this.maxIntermittentFailures) {
      this.intermittentFailureCount++;
      return { success: false, error: 'Intermittent failure' };
    }

    this.configs.set('global', config);
    return { success: true };
  }

  async updateFolderConfig(folderUri: vscode.Uri, config: any) {
    if (this.failureMode === 'folder-write') {
      return { success: false, error: 'Folder config write failed' };
    }

    if (this.failureMode === 'intermittent' && this.intermittentFailureCount < this.maxIntermittentFailures) {
      this.intermittentFailureCount++;
      return { success: false, error: 'Intermittent failure' };
    }

    this.configs.set(folderUri.fsPath, config);
    return { success: true };
  }

  async getWorkspaceTree(rootUri: vscode.Uri) {
    if (this.failureMode === 'workspace-tree') {
      return { success: false, error: 'Workspace tree failed' };
    }

    return {
      success: true,
      data: {
        rootPath: rootUri.fsPath,
        folders: [
          { path: path.join(rootUri.fsPath, 'src') },
          { path: path.join(rootUri.fsPath, 'tests') }
        ]
      }
    };
  }

  getConfig(key: string): any {
    return this.configs.get(key);
  }

  reset(): void {
    this.failureMode = 'none';
    this.intermittentFailureCount = 0;
    this.configs.clear();
  }
}

// Mock file system with failure scenarios
class MockFailureFileSystem {
  private files = new Map<string, string>();
  private failureMode: 'none' | 'read-all' | 'write-all' | 'read-global' | 'read-folder' | 'corrupt-global' | 'corrupt-folder' | 'partial-read' = 'none';
  private readAttempts = 0;

  setFailureMode(mode: 'none' | 'read-all' | 'write-all' | 'read-global' | 'read-folder' | 'corrupt-global' | 'corrupt-folder' | 'partial-read'): void {
    this.failureMode = mode;
    this.readAttempts = 0;
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    this.readAttempts++;

    if (this.failureMode === 'read-all') {
      throw new Error('File system read failure');
    }

    if (this.failureMode === 'read-global' && uri.fsPath.includes('global-config.json')) {
      throw new Error('Global config read failure');
    }

    if (this.failureMode === 'read-folder' && uri.fsPath.includes('folder-config.json')) {
      throw new Error('Folder config read failure');
    }

    if (this.failureMode === 'partial-read' && this.readAttempts <= 2) {
      throw new Error('Partial read failure');
    }

    let content = this.files.get(uri.fsPath);
    if (!content) {
      throw new Error('File not found');
    }

    // Simulate corruption
    if (this.failureMode === 'corrupt-global' && uri.fsPath.includes('global-config.json')) {
      content = '{ corrupted json content }';
    }

    if (this.failureMode === 'corrupt-folder' && uri.fsPath.includes('folder-config.json')) {
      content = '{ invalid: json, syntax }';
    }

    return new TextEncoder().encode(content);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    if (this.failureMode === 'write-all') {
      throw new Error('File system write failure');
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

  setFile(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  reset(): void {
    this.files.clear();
    this.failureMode = 'none';
    this.readAttempts = 0;
  }
}

suite('Error Handling and Fallback Mechanism Tests', () => {
  let configManager: DatabaseConfigManager;
  let mockWorkspaceManager: MockFailureWorkspaceManager;
  let mockFs: MockFailureFileSystem;
  let testRootUri: vscode.Uri;

  // Mock vscode.workspace.fs for testing
  const originalFs = vscode.workspace.fs;

  setup(() => {
    mockWorkspaceManager = new MockFailureWorkspaceManager();
    mockFs = new MockFailureFileSystem();
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
    mockWorkspaceManager.reset();
    mockFs.reset();
    // Restore original fs
    Object.defineProperty(vscode.workspace, 'fs', {
      value: originalFs,
      writable: true,
      configurable: true
    });
  });

  suite('Configuration Validation Error Handling', () => {
    test('should handle invalid database configuration gracefully', () => {
      const invalidConfigs: DatabaseConfig[] = [
        {
          id: 'invalid-1',
          name: 'Invalid 1',
          type: 'mysql',
          host: '',
          port: 0,
          database: '',
          username: ''
        },
        {
          id: 'invalid-2',
          name: 'Invalid 2',
          type: 'redis',
          host: 'localhost',
          port: 70000 // Invalid port
        },
        {
          id: 'invalid-3',
          name: 'Invalid 3',
          type: 'clickhouse',
          host: 'localhost',
          port: 8123
          // Missing required database and username
        }
      ];

      invalidConfigs.forEach(config => {
        const error = configManager.validateConfig(config);
        assert.notStrictEqual(error, null);
        assert.strictEqual(error?.type, 'validation');
        assert.ok(error?.message);
      });
    });

    test('should provide detailed validation error information', () => {
      const invalidConfig: DatabaseConfig = {
        id: 'detailed-invalid',
        name: 'Detailed Invalid',
        type: 'mysql',
        host: '',
        port: -1,
        database: '',
        username: ''
      };

      const error = configManager.validateConfig(invalidConfig);
      assert.notStrictEqual(error, null);
      assert.strictEqual(error?.type, 'validation');
      assert.ok(error?.details);
      assert.ok(error?.message.includes('Host and port are required'));
    });

    test('should handle unknown database types', async () => {
      const unknownTypeConfig: DatabaseConfig = {
        id: 'unknown-type',
        name: 'Unknown Type',
        type: 'postgresql' as any, // Not supported
        host: 'localhost',
        port: 5432
      };

      const result = await configManager.testConnection(unknownTypeConfig);
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Unsupported database type'));
    });
  });

  suite('File System Error Handling', () => {
    test('should handle global configuration read failures', async () => {
      mockFs.setFailureMode('read-global');

      // Should not throw error, should return empty config
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(Object.keys(resolvedConfig).length, 0);
    });

    test('should handle folder configuration read failures', async () => {
      mockFs.setFailureMode('read-folder');

      const folderPath = path.join(testRootUri.fsPath, 'src');
      
      // Should not throw error, should return empty config
      const resolvedConfig = await configManager.resolveConfig(folderPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
    });

    test('should handle global configuration write failures', async () => {
      mockWorkspaceManager.setFailureMode('global-write');

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

    test('should handle folder configuration write failures', async () => {
      mockWorkspaceManager.setFailureMode('folder-write');

      const folderPath = path.join(testRootUri.fsPath, 'src');
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

    test('should handle corrupted global configuration files', async () => {
      // Set up corrupted global config
      const configPath = path.join(testRootUri.fsPath, 'global-config.json');
      mockFs.setFile(configPath, '{ invalid json }');
      mockFs.setFailureMode('corrupt-global');

      // Should handle gracefully and return empty config
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(Object.keys(resolvedConfig).length, 0);
    });

    test('should handle corrupted folder configuration files', async () => {
      const folderPath = path.join(testRootUri.fsPath, 'src');
      
      // Set up corrupted folder config
      const configPath = path.join(folderPath, 'folder-config.json');
      mockFs.setFile(configPath, '{ malformed: json }');
      mockFs.setFailureMode('corrupt-folder');

      // Should handle gracefully and return empty config
      const resolvedConfig = await configManager.resolveConfig(folderPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
    });

    test('should handle partial file system failures', async () => {
      mockFs.setFailureMode('partial-read');

      // First few attempts should fail, then succeed
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.strictEqual(typeof resolvedConfig, 'object');
    });
  });

  suite('Workspace Manager Error Handling', () => {
    test('should handle workspace tree retrieval failures', async () => {
      mockWorkspaceManager.setFailureMode('workspace-tree');

      // Should not throw error during preload
      await configManager.preloadConfigurations();
      
      // Test passes if no error is thrown
      assert.ok(true);
    });

    test('should handle intermittent workspace manager failures', async () => {
      mockWorkspaceManager.setFailureMode('intermittent');

      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'intermittent-mysql',
          name: 'Intermittent MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'test'
        }
      };

      // First attempts should fail, then succeed
      try {
        await configManager.setGlobalConfig(globalConfig);
        assert.fail('Expected first attempt to fail');
      } catch (error: any) {
        assert.ok(error.message.includes('Failed to set global config'));
      }

      try {
        await configManager.setGlobalConfig(globalConfig);
        assert.fail('Expected second attempt to fail');
      } catch (error: any) {
        assert.ok(error.message.includes('Failed to set global config'));
      }

      // Third attempt should succeed
      await configManager.setGlobalConfig(globalConfig);
      
      // Verify config was set
      const savedConfig = mockWorkspaceManager.getConfig('global');
      assert.notStrictEqual(savedConfig, null);
    });
  });

  suite('Missing Workspace Root Error Handling', () => {
    test('should handle missing workspace root for global config operations', async () => {
      const configManagerWithoutRoot = new DatabaseConfigManager(mockWorkspaceManager);

      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'no-root-mysql',
          name: 'No Root MySQL',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'test'
        }
      };

      try {
        await configManagerWithoutRoot.setGlobalConfig(globalConfig);
        assert.fail('Expected error was not thrown');
      } catch (error: any) {
        assert.ok(error.message.includes('No workspace root set'));
      }
    });

    test('should handle missing workspace root for preload operations', async () => {
      const configManagerWithoutRoot = new DatabaseConfigManager(mockWorkspaceManager);

      // Should not throw error
      await configManagerWithoutRoot.preloadConfigurations();
      
      // Test passes if no error is thrown
      assert.ok(true);
    });

    test('should handle missing workspace root for resolution operations', async () => {
      const configManagerWithoutRoot = new DatabaseConfigManager(mockWorkspaceManager);

      // Should return empty config
      const resolvedConfig = await configManagerWithoutRoot.resolveConfig('/some/path');
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(Object.keys(resolvedConfig).length, 0);
    });
  });

  suite('Connection Testing Error Handling', () => {
    test('should handle connection timeout gracefully', async () => {
      const config: DatabaseConfig = {
        id: 'timeout-test',
        name: 'Timeout Test',
        type: 'mysql',
        host: '192.0.2.1', // Non-routable IP for testing timeout
        port: 3306,
        database: 'test',
        username: 'test',
        timeout: 1000 // Short timeout
      };

      const result = await configManager.testConnection(config);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.details);
    });

    test('should handle connection refused errors', async () => {
      const config: DatabaseConfig = {
        id: 'refused-test',
        name: 'Refused Test',
        type: 'redis',
        host: 'localhost',
        port: 9999, // Unlikely to be in use
        timeout: 2000
      };

      const result = await configManager.testConnection(config);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('Connection refused') || result.error.includes('timeout'));
    });

    test('should handle host not found errors', async () => {
      const config: DatabaseConfig = {
        id: 'notfound-test',
        name: 'Not Found Test',
        type: 'clickhouse',
        host: 'nonexistent.invalid.domain',
        port: 8123,
        database: 'test',
        username: 'test',
        timeout: 2000
      };

      const result = await configManager.testConnection(config);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('Host not found') || result.error.includes('timeout'));
    });

    test('should handle connection pool testing errors', async () => {
      const config: DatabaseConfig = {
        id: 'pool-test',
        name: 'Pool Test',
        type: 'mysql',
        host: '192.0.2.1', // Non-routable IP
        port: 3306,
        database: 'test',
        username: 'test',
        maxConnections: 3,
        timeout: 1000
      };

      const result = await configManager.testConnectionPool(config);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.details);
      assert.strictEqual(result.details.testedConnections, 3);
      assert.strictEqual(result.details.successfulConnections, 0);
    });
  });

  suite('Fallback Mechanisms', () => {
    test('should fallback to empty configuration when all sources fail', async () => {
      mockFs.setFailureMode('read-all');
      mockWorkspaceManager.setFailureMode('workspace-tree');

      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      
      // Should return empty but valid configuration object
      assert.strictEqual(typeof resolvedConfig, 'object');
      assert.strictEqual(resolvedConfig !== null, true);
      assert.strictEqual(Array.isArray(resolvedConfig), false);
    });

    test('should fallback to global configuration when folder configuration fails', async () => {
      // Set up global configuration
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'fallback-mysql',
          name: 'Fallback MySQL',
          type: 'mysql',
          host: 'fallback-mysql.com',
          port: 3306,
          database: 'fallback_db',
          username: 'fallback_user'
        }
      };

      await configManager.setGlobalConfig(globalConfig);

      // Make folder configuration fail
      mockFs.setFailureMode('read-folder');

      const folderPath = path.join(testRootUri.fsPath, 'src');
      const resolvedConfig = await configManager.resolveConfig(folderPath);

      // Should fallback to global configuration
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'fallback-mysql.com');
    });

    test('should maintain cache consistency during error recovery', async () => {
      const testPath = path.join(testRootUri.fsPath, 'src');

      // First resolution should succeed and populate cache
      const firstConfig = await configManager.resolveConfig(testPath);
      assert.strictEqual(configManager.hasCachedConfig(testPath), true);

      // Introduce read failure
      mockFs.setFailureMode('read-all');

      // Second resolution should use cache despite read failure
      const secondConfig = await configManager.resolveConfig(testPath);
      assert.deepStrictEqual(secondConfig, firstConfig);

      // Clear cache and try again - should get empty config due to read failure
      configManager.invalidateCache(testPath);
      const thirdConfig = await configManager.resolveConfig(testPath);
      assert.strictEqual(Object.keys(thirdConfig).length, 0);
    });

    test('should recover from transient errors', async () => {
      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'recovery-mysql',
          name: 'Recovery MySQL',
          type: 'mysql',
          host: 'recovery-mysql.com',
          port: 3306,
          database: 'recovery_db',
          username: 'recovery_user'
        }
      };

      // Set up configuration successfully
      await configManager.setGlobalConfig(globalConfig);

      // Introduce transient failure
      mockFs.setFailureMode('partial-read');

      // Should eventually succeed despite initial failures
      const resolvedConfig = await configManager.resolveConfig(testRootUri.fsPath);
      assert.ok(resolvedConfig.mysql);
      assert.strictEqual(resolvedConfig.mysql?.host, 'recovery-mysql.com');
    });
  });

  suite('Error Reporting and Logging', () => {
    test('should provide meaningful error messages for validation failures', () => {
      const configs = [
        {
          config: {
            id: 'empty-host',
            name: 'Empty Host',
            type: 'mysql' as const,
            host: '',
            port: 3306,
            database: 'test',
            username: 'test'
          },
          expectedError: 'Host and port are required'
        },
        {
          config: {
            id: 'invalid-port',
            name: 'Invalid Port',
            type: 'redis' as const,
            host: 'localhost',
            port: 0
          },
          expectedError: 'Port must be between 1 and 65535'
        },
        {
          config: {
            id: 'missing-mysql-fields',
            name: 'Missing MySQL Fields',
            type: 'mysql' as const,
            host: 'localhost',
            port: 3306
          },
          expectedError: 'Database and username are required for MySQL'
        }
      ];

      configs.forEach(({ config, expectedError }) => {
        const error = configManager.validateConfig(config);
        assert.notStrictEqual(error, null);
        assert.ok(error?.message.includes(expectedError));
      });
    });

    test('should provide detailed error context for connection failures', async () => {
      const config: DatabaseConfig = {
        id: 'context-test',
        name: 'Context Test',
        type: 'mysql',
        host: '192.0.2.1', // Non-routable IP
        port: 3306,
        database: 'test',
        username: 'test',
        timeout: 1000
      };

      const result = await configManager.testConnection(config);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.details);
      assert.ok(result.details.host);
      assert.ok(result.details.port);
    });

    test('should handle error propagation correctly', async () => {
      mockWorkspaceManager.setFailureMode('global-write');

      const globalConfig: DatabaseConfigSet = {
        mysql: {
          id: 'propagation-test',
          name: 'Propagation Test',
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
        // Error should be properly wrapped and include context
        assert.ok(error.message.includes('Failed to set global config'));
        assert.ok(error.message.includes('Global config write failed'));
      }
    });
  });
});