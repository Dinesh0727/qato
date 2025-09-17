import * as assert from 'assert';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig } from '../workspaceTypes';

suite('Connection Testing Tests', () => {
  let configManager: DatabaseConfigManager;
  let mockWorkspaceManager: any;

  setup(() => {
    mockWorkspaceManager = {
      updateGlobalConfig: () => Promise.resolve({ success: true }),
      updateFolderConfig: () => Promise.resolve({ success: true }),
      getWorkspaceTree: () => Promise.resolve({ success: true, data: { folders: [] } })
    };
    configManager = new DatabaseConfigManager(mockWorkspaceManager);
  });

  test('should validate MySQL configuration correctly', async () => {
    const validConfig: DatabaseConfig = {
      id: 'test-mysql',
      name: 'Test MySQL',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test_db',
      username: 'root',
      password: 'password',
      timeout: 30000
    };

    const validationError = configManager.validateConfig(validConfig);
    assert.strictEqual(validationError, null);
  });

  test('should validate Redis configuration correctly', async () => {
    const validConfig: DatabaseConfig = {
      id: 'test-redis',
      name: 'Test Redis',
      type: 'redis',
      host: 'localhost',
      port: 6379,
      timeout: 30000
    };

    const validationError = configManager.validateConfig(validConfig);
    assert.strictEqual(validationError, null);
  });

  test('should validate ClickHouse configuration correctly', async () => {
    const validConfig: DatabaseConfig = {
      id: 'test-clickhouse',
      name: 'Test ClickHouse',
      type: 'clickhouse',
      host: 'localhost',
      port: 8123,
      database: 'default',
      username: 'default',
      password: '',
      timeout: 30000
    };

    const validationError = configManager.validateConfig(validConfig);
    assert.strictEqual(validationError, null);
  });

  test('should reject invalid port numbers', async () => {
    const invalidConfig: DatabaseConfig = {
      id: 'test-invalid',
      name: 'Test Invalid',
      type: 'mysql',
      host: 'localhost',
      port: 70000, // Invalid port
      database: 'test_db',
      username: 'root'
    };

    const validationError = configManager.validateConfig(invalidConfig);
    assert.notStrictEqual(validationError, null);
    assert.strictEqual(validationError?.type, 'validation');
    assert.ok(validationError?.message.includes('Port must be between 1 and 65535'));
  });

  test('should reject MySQL config without required fields', async () => {
    const invalidConfig: DatabaseConfig = {
      id: 'test-invalid',
      name: 'Test Invalid',
      type: 'mysql',
      host: 'localhost',
      port: 3306
      // Missing database and username
    };

    const validationError = configManager.validateConfig(invalidConfig);
    assert.notStrictEqual(validationError, null);
    assert.strictEqual(validationError?.type, 'validation');
    assert.ok(validationError?.message.includes('Database and username are required'));
  });

  test('should handle connection test timeout', async () => {
    const config: DatabaseConfig = {
      id: 'test-timeout',
      name: 'Test Timeout',
      type: 'mysql',
      host: '192.0.2.1', // Non-routable IP for testing timeout
      port: 3306,
      database: 'test_db',
      username: 'root',
      timeout: 1000 // Short timeout for testing
    };

    const result = await configManager.testConnection(config);
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('timeout') || result.error.includes('Connection refused') || result.error.includes('Host not found'));
  });

  test('should handle invalid database type', async () => {
    const config: DatabaseConfig = {
      id: 'test-invalid-type',
      name: 'Test Invalid Type',
      type: 'invalid' as any,
      host: 'localhost',
      port: 3306
    };

    const result = await configManager.testConnection(config);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Unsupported database type'));
  });

  test('should test connection pool functionality', async () => {
    const config: DatabaseConfig = {
      id: 'test-pool',
      name: 'Test Pool',
      type: 'redis',
      host: '192.0.2.1', // Non-routable IP
      port: 6379,
      maxConnections: 3,
      timeout: 1000
    };

    const result = await configManager.testConnectionPool(config);
    assert.strictEqual(result.success, false);
    assert.ok(result.details);
    assert.strictEqual(result.details.testedConnections, 3);
    assert.strictEqual(result.details.successfulConnections, 0);
  });
});