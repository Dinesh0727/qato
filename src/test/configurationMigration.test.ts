import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationMigration } from '../configurationMigration';
import { GlobalConfig, DatabaseConfigSet } from '../workspaceTypes';

suite('Configuration Migration Tests', () => {
    let configMigration: ConfigurationMigration;
    let testWorkspaceUri: vscode.Uri;

    setup(async () => {
        configMigration = new ConfigurationMigration();
        
        // Create a temporary test workspace directory
        const tempDir = path.join(__dirname, '..', '..', 'test-temp', `migration-test-${Date.now()}`);
        testWorkspaceUri = vscode.Uri.file(tempDir);
        
        try {
            await vscode.workspace.fs.createDirectory(testWorkspaceUri);
        } catch (error) {
            // Directory might already exist
        }
    });

    teardown(async () => {
        // Clean up test workspace
        try {
            await vscode.workspace.fs.delete(testWorkspaceUri, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test('Should create default configuration for new workspace', async () => {
        // Act
        const result = await configMigration.migrateWorkspaceConfiguration(testWorkspaceUri);

        // Assert
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, true); // Migration was performed

        // Verify global config was created
        const globalConfigPath = vscode.Uri.joinPath(testWorkspaceUri, 'global-config.json');
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config: GlobalConfig = JSON.parse(configData.toString());

        assert.strictEqual(config.version, '1.0.0');
        assert.ok(config.databases);
        assert.ok(config.databases.mysql);
        assert.ok(config.databases.redis);
        assert.ok(config.databases.clickhouse);
        assert.strictEqual(config.databases.redis?.database, '0'); // Should be string
    });

    test('Should migrate legacy configuration', async () => {
        // Arrange - Create legacy configuration
        const targetDir = vscode.Uri.joinPath(testWorkspaceUri, 'target');
        await vscode.workspace.fs.createDirectory(targetDir);
        
        const legacyConfig = {
            databases: {
                mysql: {
                    id: 'legacy-mysql',
                    name: 'Legacy MySQL',
                    type: 'mysql',
                    host: 'legacy-host',
                    port: 3306,
                    database: 'legacy_db',
                    username: 'legacy_user',
                    password: 'legacy_pass',
                    timeout: 25000
                },
                redis: {
                    id: 'legacy-redis',
                    name: 'Legacy Redis',
                    type: 'redis',
                    host: 'redis-host',
                    port: 6379,
                    database: 1, // Number format (should be converted to string)
                    timeout: 20000
                }
            },
            timestamp: new Date().toISOString()
        };

        const legacyConfigPath = vscode.Uri.joinPath(targetDir, 'qato-db-config.json');
        await vscode.workspace.fs.writeFile(
            legacyConfigPath, 
            Buffer.from(JSON.stringify(legacyConfig, null, 2), 'utf8')
        );

        // Act
        const result = await configMigration.migrateWorkspaceConfiguration(testWorkspaceUri);

        // Assert
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, true);

        // Verify migrated configuration
        const globalConfigPath = vscode.Uri.joinPath(testWorkspaceUri, 'global-config.json');
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config: GlobalConfig = JSON.parse(configData.toString());

        assert.strictEqual(config.version, '1.0.0');
        assert.ok(config.databases.mysql);
        assert.strictEqual(config.databases.mysql?.host, 'legacy-host');
        assert.strictEqual(config.databases.mysql?.database, 'legacy_db');
        assert.ok(config.databases.redis);
        assert.strictEqual(config.databases.redis?.host, 'redis-host');
        assert.strictEqual(config.databases.redis?.database, '1'); // Should be converted to string
        assert.ok(config.databases.redis?.description?.includes('Migrated from legacy'));
    });

    test('Should apply backward compatibility fixes', async () => {
        // Arrange - Create configuration with missing fields
        const incompleteConfig = {
            version: '1.0.0',
            databases: {
                mysql: {
                    id: 'test-mysql',
                    name: 'Test MySQL',
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    database: 'test',
                    username: 'root',
                    password: '',
                    timeout: 30000
                    // Missing: maxConnections, ssl, description
                },
                redis: {
                    id: 'test-redis',
                    name: 'Test Redis',
                    type: 'redis',
                    host: 'localhost',
                    port: 6379,
                    database: 0, // Wrong type (should be string)
                    timeout: 30000
                    // Missing: maxConnections, ssl, description
                }
            }
        };

        const globalConfigPath = vscode.Uri.joinPath(testWorkspaceUri, 'global-config.json');
        await vscode.workspace.fs.writeFile(
            globalConfigPath,
            Buffer.from(JSON.stringify(incompleteConfig, null, 2), 'utf8')
        );

        // Act
        const result = await configMigration.migrateWorkspaceConfiguration(testWorkspaceUri);

        // Assert
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, true); // Compatibility fixes were applied

        // Verify fixes were applied
        const configData = await vscode.workspace.fs.readFile(globalConfigPath);
        const config: GlobalConfig = JSON.parse(configData.toString());

        assert.ok(config.databases.mysql?.maxConnections);
        assert.strictEqual(config.databases.mysql?.ssl, false);
        assert.ok(config.databases.mysql?.description);
        assert.ok(config.databases.redis?.maxConnections);
        assert.strictEqual(config.databases.redis?.ssl, false);
        assert.ok(config.databases.redis?.description);
        assert.strictEqual(config.databases.redis?.database, '0'); // Should be converted to string
    });

    test('Should validate migrated configuration', async () => {
        // Arrange - Create invalid configuration
        const invalidConfig = {
            version: '1.0.0',
            databases: {
                mysql: {
                    id: 'test-mysql',
                    name: 'Test MySQL',
                    type: 'mysql',
                    host: 'localhost',
                    port: 99999, // Invalid port
                    database: 'test',
                    username: 'root',
                    password: '',
                    timeout: 30000
                }
            }
        };

        const globalConfigPath = vscode.Uri.joinPath(testWorkspaceUri, 'global-config.json');
        await vscode.workspace.fs.writeFile(
            globalConfigPath,
            Buffer.from(JSON.stringify(invalidConfig, null, 2), 'utf8')
        );

        // Act
        const validationResult = await configMigration.validateMigratedConfiguration(testWorkspaceUri);

        // Assert
        assert.strictEqual(validationResult.success, false);
        assert.ok(validationResult.error?.includes('Port must be between 1 and 65535'));
    });

    test('Should test migration scenarios', async () => {
        // Arrange - Create legacy configuration
        const targetDir = vscode.Uri.joinPath(testWorkspaceUri, 'target');
        await vscode.workspace.fs.createDirectory(targetDir);
        
        const legacyConfig = {
            databases: {
                mysql: {
                    id: 'test-mysql',
                    name: 'Test MySQL',
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306
                }
            }
        };

        const legacyConfigPath = vscode.Uri.joinPath(targetDir, 'qato-db-config.json');
        await vscode.workspace.fs.writeFile(
            legacyConfigPath,
            Buffer.from(JSON.stringify(legacyConfig, null, 2), 'utf8')
        );

        // Act
        const result = await configMigration.testMigrationScenarios(testWorkspaceUri);

        // Assert
        assert.strictEqual(result.success, true);
        assert.ok(result.data);
        assert.strictEqual(result.data.scenarios.legacyConfigExists, true);
        assert.strictEqual(result.data.scenarios.globalConfigExists, false);
        assert.strictEqual(result.data.scenarios.migrationNeeded, true);
        assert.ok(result.data.recommendations);
        assert.ok(result.data.recommendations.length > 0);
    });

    test('Should export and import configuration', async () => {
        // Arrange - Create configuration
        const config: GlobalConfig = {
            version: '1.0.0',
            defaultSettings: {
                timeout: 30000,
                retryCount: 3
            },
            databases: {
                mysql: {
                    id: 'export-test-mysql',
                    name: 'Export Test MySQL',
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    database: 'test',
                    username: 'root',
                    password: '',
                    timeout: 30000,
                    maxConnections: 10,
                    ssl: false,
                    description: 'Test MySQL for export'
                }
            }
        };

        const globalConfigPath = vscode.Uri.joinPath(testWorkspaceUri, 'global-config.json');
        await vscode.workspace.fs.writeFile(
            globalConfigPath,
            Buffer.from(JSON.stringify(config, null, 2), 'utf8')
        );

        // Act - Export
        const exportResult = await configMigration.exportConfiguration(testWorkspaceUri);

        // Assert - Export
        assert.strictEqual(exportResult.success, true);
        assert.ok(exportResult.data);
        assert.ok(exportResult.data.globalConfig);
        assert.strictEqual(exportResult.data.globalConfig.databases.mysql.name, 'Export Test MySQL');

        // Act - Import to new workspace
        const newWorkspaceUri = vscode.Uri.file(path.join(__dirname, '..', '..', 'test-temp', `import-test-${Date.now()}`));
        await vscode.workspace.fs.createDirectory(newWorkspaceUri);

        const importResult = await configMigration.importConfiguration(newWorkspaceUri, exportResult.data);

        // Assert - Import
        assert.strictEqual(importResult.success, true);
        assert.strictEqual(importResult.data, true);

        // Verify imported configuration
        const importedConfigPath = vscode.Uri.joinPath(newWorkspaceUri, 'global-config.json');
        const importedConfigData = await vscode.workspace.fs.readFile(importedConfigPath);
        const importedConfig: GlobalConfig = JSON.parse(importedConfigData.toString());

        assert.strictEqual(importedConfig.databases.mysql?.name, 'Export Test MySQL');
        assert.strictEqual(importedConfig.databases.mysql?.id, 'export-test-mysql');

        // Cleanup
        try {
            await vscode.workspace.fs.delete(newWorkspaceUri, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });
});