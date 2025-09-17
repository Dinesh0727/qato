// Simple test runner for debugging individual test files
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseConfigManager } from '../databaseConfigManager';
import { DatabaseConfig, DatabaseConfigSet } from '../workspaceTypes';

// Mock WorkspaceManager for testing
class SimpleTestWorkspaceManager {
  private configs = new Map<string, any>();

  async updateGlobalConfig(rootUri: vscode.Uri, config: any) {
    this.configs.set('global', config);
    return { success: true };
  }

  async updateFolderConfig(folderUri: vscode.Uri, config: any) {
    this.configs.set(folderUri.fsPath, config);
    return { success: true };
  }

  async getWorkspaceTree(rootUri: vscode.Uri) {
    return {
      success: true,
      data: {
        rootPath: rootUri.fsPath,
        folders: []
      }
    };
  }

  getConfig(key: string) {
    return this.configs.get(key);
  }
}

// Simple test function
async function runSimpleTest() {
  console.log('Running simple database config manager test...');
  
  const mockWorkspaceManager = new SimpleTestWorkspaceManager();
  const configManager = new DatabaseConfigManager(mockWorkspaceManager);
  const testRootUri = vscode.Uri.file('/test/workspace');
  configManager.setRootUri(testRootUri);

  // Test 1: Basic validation
  const validConfig: DatabaseConfig = {
    id: 'test-mysql',
    name: 'Test MySQL',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'test',
    username: 'root'
  };

  const validationResult = configManager.validateConfig(validConfig);
  assert.strictEqual(validationResult, null, 'Valid config should pass validation');
  console.log('✓ Validation test passed');

  // Test 2: Cache operations
  const testPath = '/test/folder';
  assert.strictEqual(configManager.hasCachedConfig(testPath), false, 'Initially no cache');
  
  await configManager.resolveConfig(testPath);
  assert.strictEqual(configManager.hasCachedConfig(testPath), true, 'Cache should be populated');
  
  configManager.invalidateCache(testPath);
  assert.strictEqual(configManager.hasCachedConfig(testPath), false, 'Cache should be cleared');
  console.log('✓ Cache test passed');

  // Test 3: Configuration setting
  const globalConfig: DatabaseConfigSet = {
    mysql: {
      id: 'global-mysql',
      name: 'Global MySQL',
      type: 'mysql',
      host: 'global-host',
      port: 3306,
      database: 'global-db',
      username: 'global-user'
    }
  };

  await configManager.setGlobalConfig(globalConfig);
  const savedConfig = mockWorkspaceManager.getConfig('global');
  assert.notStrictEqual(savedConfig, null, 'Config should be saved');
  console.log('✓ Configuration setting test passed');

  console.log('All simple tests passed!');
}

// Export for potential use
export { runSimpleTest };