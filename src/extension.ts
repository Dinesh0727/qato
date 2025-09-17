import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { QATO_CONFIG, buildErrorRegex, isDbError } from './config';
import { WorkspaceManager } from './workspaceManager';
import { DatabaseConfigManager } from './databaseConfigManager';
import { WorkspaceMessage, WorkspaceTree, DatabaseConfigSet } from './workspaceTypes';

let dbAccessProcess: cp.ChildProcess | null = null;
let workspaceManager: WorkspaceManager | null = null;
let databaseConfigManager: DatabaseConfigManager | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG:extension.ts] Activating extension.');
    
    // Initialize workspace manager
    workspaceManager = new WorkspaceManager();
    
    // Initialize database config manager
    databaseConfigManager = new DatabaseConfigManager(workspaceManager);
    
    // Set up configuration change callback
    databaseConfigManager.setOnConfigurationChanged(async () => {
        await writeDatabaseConfigurationsToFile();
    });
    
    let showPanelCommand = vscode.commands.registerCommand('qato.showPanel', async () => {
        console.log('[DEBUG:extension.ts] showPanel command triggered.');
        const panel = vscode.window.createWebviewPanel(
            'qatoPanel',
            'QATO Visual Builder',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist-ui'))]
            }
        );

        const distPath = path.join(context.extensionPath, 'dist-ui');
        const htmlPath = path.join(distPath, 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        let finalHtml = htmlContent.replace(/\/assets\//g, `${panel.webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'assets')))}/`);
        finalHtml = finalHtml.replace(
            '<body>',
            `<body><script>const vscode = acquireVsCodeApi();</script>`
        );
        panel.webview.html = finalHtml;

        // Initialize workspace on panel creation
        await initializeWorkspaceForPanel(panel);

        panel.webview.onDidReceiveMessage(
            async message => { // Make the handler async
                console.log('[DEBUG:extension.ts] Received message from webview:', message);
                await handleWebviewMessage(message, panel, context);
            },
            undefined,
            context.subscriptions
        );

        panel.onDidDispose(() => {
            console.log('[DEBUG:extension.ts] Webview panel disposed.');
            stopDbAccessService();
            if (workspaceManager) {
                workspaceManager.dispose();
            }
            if (databaseConfigManager) {
                databaseConfigManager.invalidateCache();
            }
        });
    });

    context.subscriptions.push(showPanelCommand);
}

/**
 * Initialize workspace for the webview panel
 */
async function initializeWorkspaceForPanel(panel: vscode.WebviewPanel) {
    if (!workspaceManager) {
        panel.webview.postMessage({
            command: 'workspaceError',
            payload: { error: 'Workspace manager not initialized' }
        });
        return;
    }

    // Prompt user to select workspace root
    const workspaceUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select QATO Workspace Folder',
        title: 'Choose folder for QATO test cases'
    });

    if (!workspaceUri || workspaceUri.length === 0) {
        // User cancelled, send empty workspace
        panel.webview.postMessage({
            command: 'workspaceInitialized',
            payload: { 
                workspaceTree: { 
                    rootPath: '', 
                    folders: [] 
                } 
            }
        });
        return;
    }

    const rootUri = workspaceUri[0];
    
    // Initialize workspace structure
    const initResult = await workspaceManager.initializeWorkspace(rootUri);
    if (!initResult.success) {
        panel.webview.postMessage({
            command: 'workspaceError',
            payload: { error: initResult.error || 'Failed to initialize workspace' }
        });
        return;
    }

    // Set root URI for database config manager
    if (databaseConfigManager) {
        databaseConfigManager.setRootUri(rootUri);
        // Preload configurations for performance
        await databaseConfigManager.preloadConfigurations();
    }

    // Load workspace tree
    const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
    if (!treeResult.success || !treeResult.data) {
        panel.webview.postMessage({
            command: 'workspaceError',
            payload: { error: treeResult.error || 'Failed to load workspace tree' }
        });
        return;
    }

    // Send workspace tree to webview
    panel.webview.postMessage({
        command: 'workspaceInitialized',
        payload: { workspaceTree: treeResult.data }
    });

    // Set up file watcher
    workspaceManager.setupFileWatcher(rootUri, (updatedTree: WorkspaceTree) => {
        panel.webview.postMessage({
            command: 'fileSystemChanged',
            payload: { workspaceTree: updatedTree }
        });
    }, async (configPath: string, config: DatabaseConfigSet) => {
        // Handle database configuration changes
        console.log('[DEBUG:extension.ts] Database configuration changed:', configPath, config);
        
        // Write updated configurations to file for Java backend
        await writeDatabaseConfigurationsToFile();
        
        // Notify webview of configuration change
        panel.webview.postMessage({
            command: 'databaseConfigUpdated',
            payload: { path: configPath, config }
        });
    });
}

/**
 * Handle messages from the webview
 */
async function handleWebviewMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    if (!workspaceManager) {
        panel.webview.postMessage({
            command: 'workspaceError',
            payload: { error: 'Workspace manager not initialized' }
        });
        return;
    }

    switch (message.command) {
        case 'runGeneratedTest':
            runGeneratedKarateTest(message.payload.featureFileContent, context, panel, message.payload.folderPath);
            break;

        case 'showInputBox': {
            const { prompt, placeholder, context: messageContext } = message.payload;
            const result = await vscode.window.showInputBox({
                prompt: prompt,
                placeHolder: placeholder,
            });

            // Send the result back to the webview, including the original context
            panel.webview.postMessage({
                command: 'inputBoxResult',
                payload: {
                    value: result, // Will be undefined if the user cancels
                    context: messageContext
                }
            });
            break;
        }

        case 'saveTestCase': {
            const { testCase, collectionPath } = message.payload;
            const fileName = `${testCase.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.test.json`;
            const testCaseUri = vscode.Uri.file(path.join(collectionPath, fileName));
            
            const result = await workspaceManager.saveTestCase(testCaseUri, testCase);
            if (!result.success) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to save test case' }
                });
            }
            break;
        }

        case 'createFolder': {
            const { name, parentPath } = message.payload;
            const parentUri = parentPath ? vscode.Uri.file(parentPath) : undefined;
            
            const result = await workspaceManager.createFolder(name, parentUri);
            if (!result.success) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to create folder' }
                });
            } else {
                // Immediately refresh workspace tree after successful folder creation
                const rootUri = parentUri || workspaceManager.getRootUri();
                if (rootUri) {
                    const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
                    if (treeResult.success && treeResult.data) {
                        panel.webview.postMessage({
                            command: 'fileSystemChanged',
                            payload: { workspaceTree: treeResult.data }
                        });
                    }
                }
            }
            break;
        }

        case 'createCollection': {
            const { name, folderPath } = message.payload;
            const folderUri = vscode.Uri.file(folderPath);
            
            const result = await workspaceManager.createCollection(name, folderUri);
            if (!result.success) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to create collection' }
                });
            } else {
                // Immediately refresh workspace tree after successful collection creation
                const rootUri = workspaceManager.getRootUri();
                if (rootUri) {
                    const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
                    if (treeResult.success && treeResult.data) {
                        panel.webview.postMessage({
                            command: 'fileSystemChanged',
                            payload: { workspaceTree: treeResult.data }
                        });
                    }
                }
            }
            break;
        }

        case 'deleteTestCase': {
            const { testCasePath } = message.payload;
            const testCaseUri = vscode.Uri.file(testCasePath);
            
            try {
                await vscode.workspace.fs.delete(testCaseUri);
                // File watcher will automatically update the UI
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: `Failed to delete test case: ${error.message}` }
                });
            }
            break;
        }

        case 'deleteCollection': {
            const { collectionPath } = message.payload;
            const collectionUri = vscode.Uri.file(collectionPath);
            
            try {
                await vscode.workspace.fs.delete(collectionUri, { recursive: true });
                // File watcher will automatically update the UI
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: `Failed to delete collection: ${error.message}` }
                });
            }
            break;
        }

        case 'deleteFolder': {
            const { folderPath } = message.payload;
            const folderUri = vscode.Uri.file(folderPath);
            
            try {
                await vscode.workspace.fs.delete(folderUri, { recursive: true });
                // File watcher will automatically update the UI
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: `Failed to delete folder: ${error.message}` }
                });
            }
            break;
        }

        case 'updateGlobalConfig': {
            const { config } = message.payload;
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'No workspace root available' }
                });
                break;
            }

            const result = await workspaceManager.updateGlobalConfig(rootUri, config);
            if (!result.success) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to update global config' }
                });
            }
            break;
        }

        case 'updateFolderConfig': {
            const { folderPath, config } = message.payload;
            const folderUri = vscode.Uri.file(folderPath);
            
            const result = await workspaceManager.updateFolderConfig(folderUri, config);
            if (!result.success) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to update folder config' }
                });
            }
            break;
        }

        case 'initializeWorkspace': {
            await initializeWorkspaceForPanel(panel);
            break;
        }

        case 'getDatabaseConfig': {
            if (!databaseConfigManager) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: 'Database config manager not initialized' 
                        } 
                    }
                });
                break;
            }

            const { path: configPath, dbType } = message.payload;
            try {
                if (dbType) {
                    const config = await databaseConfigManager.getConfigForPath(configPath, dbType);
                    panel.webview.postMessage({
                        command: 'databaseConfigResolved',
                        payload: { 
                            path: configPath, 
                            config: config ? { [dbType]: config } : {},
                            context: await databaseConfigManager.getConfigurationContext(configPath)
                        }
                    });
                } else {
                    const config = await databaseConfigManager.resolveConfig(configPath);
                    panel.webview.postMessage({
                        command: 'databaseConfigResolved',
                        payload: { 
                            path: configPath, 
                            config,
                            context: await databaseConfigManager.getConfigurationContext(configPath)
                        }
                    });
                }
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: error.message,
                            path: configPath
                        } 
                    }
                });
            }
            break;
        }

        case 'setDatabaseConfig': {
            if (!databaseConfigManager) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: 'Database config manager not initialized' 
                        } 
                    }
                });
                break;
            }

            const { path: configPath, config, level } = message.payload;
            try {
                if (level === 'global') {
                    await databaseConfigManager.setGlobalConfig(config);
                } else if (level === 'folder') {
                    await databaseConfigManager.setFolderConfig(configPath, config);
                }

                panel.webview.postMessage({
                    command: 'databaseConfigUpdated',
                    payload: { path: configPath, config }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: error.message,
                            path: configPath
                        } 
                    }
                });
            }
            break;
        }

        case 'resolveDatabaseConfig': {
            if (!databaseConfigManager) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: 'Database config manager not initialized' 
                        } 
                    }
                });
                break;
            }

            const { path: configPath } = message.payload;
            try {
                const config = await databaseConfigManager.resolveConfig(configPath);
                const context = await databaseConfigManager.getConfigurationContext(configPath);
                
                panel.webview.postMessage({
                    command: 'databaseConfigResolved',
                    payload: { path: configPath, config, context }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'databaseConfigError',
                    payload: { 
                        error: { 
                            type: 'storage', 
                            message: error.message,
                            path: configPath
                        } 
                    }
                });
            }
            break;
        }

        case 'testDatabaseConnection': {
            if (!databaseConfigManager) {
                panel.webview.postMessage({
                    command: 'databaseConnectionTestResult',
                    payload: { success: false, error: 'Database config manager not initialized' }
                });
                break;
            }

            const { config } = message.payload;
            try {
                // Perform real connection test with timeout and error handling
                const testResult = await databaseConfigManager.testConnection(config);
                
                panel.webview.postMessage({
                    command: 'databaseConnectionTestResult',
                    payload: testResult
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'databaseConnectionTestResult',
                    payload: { 
                        success: false, 
                        error: `Connection test failed: ${error.message}`,
                        details: { originalError: error }
                    }
                });
            }
            break;
        }

        case 'performMigration': {
            const { force } = message.payload;
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'migrationCompleted',
                    payload: { success: false, migrationPerformed: false, error: 'No workspace root available' }
                });
                break;
            }

            try {
                let result;
                if (force) {
                    result = await workspaceManager.forceMigration(rootUri);
                } else {
                    result = await workspaceManager.migrateWorkspaceConfiguration(rootUri);
                }

                panel.webview.postMessage({
                    command: 'migrationCompleted',
                    payload: { 
                        success: result.success, 
                        migrationPerformed: result.data || false,
                        error: result.error
                    }
                });

                // If migration was successful, refresh workspace tree
                if (result.success && result.data) {
                    const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
                    if (treeResult.success && treeResult.data) {
                        panel.webview.postMessage({
                            command: 'fileSystemChanged',
                            payload: { workspaceTree: treeResult.data }
                        });
                    }
                }
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'migrationCompleted',
                    payload: { 
                        success: false, 
                        migrationPerformed: false,
                        error: `Migration failed: ${error.message}`
                    }
                });
            }
            break;
        }

        case 'getMigrationHistory': {
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'migrationHistoryResult',
                    payload: { success: false, error: 'No workspace root available' }
                });
                break;
            }

            try {
                const result = await workspaceManager.getMigrationHistory(rootUri);
                panel.webview.postMessage({
                    command: 'migrationHistoryResult',
                    payload: { 
                        success: result.success, 
                        history: result.data,
                        error: result.error
                    }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'migrationHistoryResult',
                    payload: { 
                        success: false, 
                        error: `Failed to get migration history: ${error.message}`
                    }
                });
            }
            break;
        }

        case 'testMigrationScenarios': {
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'migrationScenariosResult',
                    payload: { success: false, error: 'No workspace root available' }
                });
                break;
            }

            try {
                const result = await workspaceManager.testMigrationScenarios(rootUri);
                panel.webview.postMessage({
                    command: 'migrationScenariosResult',
                    payload: { 
                        success: result.success, 
                        scenarios: result.data?.scenarios,
                        recommendations: result.data?.recommendations,
                        error: result.error
                    }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'migrationScenariosResult',
                    payload: { 
                        success: false, 
                        error: `Failed to test migration scenarios: ${error.message}`
                    }
                });
            }
            break;
        }

        case 'exportConfiguration': {
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'configurationExported',
                    payload: { success: false, error: 'No workspace root available' }
                });
                break;
            }

            try {
                const result = await workspaceManager.exportConfiguration(rootUri);
                panel.webview.postMessage({
                    command: 'configurationExported',
                    payload: { 
                        success: result.success, 
                        data: result.data,
                        error: result.error
                    }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'configurationExported',
                    payload: { 
                        success: false, 
                        error: `Failed to export configuration: ${error.message}`
                    }
                });
            }
            break;
        }

        case 'importConfiguration': {
            const { data } = message.payload;
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                panel.webview.postMessage({
                    command: 'configurationImported',
                    payload: { success: false, imported: false, error: 'No workspace root available' }
                });
                break;
            }

            try {
                const result = await workspaceManager.importConfiguration(data, rootUri);
                panel.webview.postMessage({
                    command: 'configurationImported',
                    payload: { 
                        success: result.success, 
                        imported: result.data || false,
                        error: result.error
                    }
                });

                // If import was successful, refresh workspace tree
                if (result.success && result.data) {
                    const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
                    if (treeResult.success && treeResult.data) {
                        panel.webview.postMessage({
                            command: 'fileSystemChanged',
                            payload: { workspaceTree: treeResult.data }
                        });
                    }
                }
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'configurationImported',
                    payload: { 
                        success: false, 
                        imported: false,
                        error: `Failed to import configuration: ${error.message}`
                    }
                });
            }
            break;
        }

        case 'getConfigurationTemplates': {
            try {
                const migrationUtility = workspaceManager.getMigrationUtility();
                const templates = migrationUtility.getConfigurationTemplates();
                panel.webview.postMessage({
                    command: 'configurationTemplatesResult',
                    payload: { 
                        success: true, 
                        templates: templates
                    }
                });
            } catch (error: any) {
                panel.webview.postMessage({
                    command: 'configurationTemplatesResult',
                    payload: { 
                        success: false, 
                        error: `Failed to get configuration templates: ${error.message}`
                    }
                });
            }
            break;
        }
    }
}

function startDbAccessService(context: vscode.ExtensionContext): Promise<void> {
    return new Promise((resolve, reject) => {
        if (dbAccessProcess) {
            console.log('[QATO] DB Access service already running.');
            resolve();
            return;
        }

        const projectRootPath = context.extensionPath;
        const springBootJarPath = path.join(projectRootPath, 'java-utils', 'qa-tool-orchaestrator', 'target', QATO_CONFIG.DB_SERVICE.JAR_NAME);

        console.log(`[QATO] Starting DB Access service: ${springBootJarPath}`);

        dbAccessProcess = cp.spawn('java', ['-jar', springBootJarPath], {
            cwd: projectRootPath
        });

        dbAccessProcess.stdout?.on('data', data => {
            console.log(`[DB Service] ${data}`);
            if (data.toString().includes('Started QaToolOrchaestratorApplication')) {
                console.log('[QATO] DB Access service started successfully.');
                resolve();
            }
        });

        dbAccessProcess.stderr?.on('data', data => {
            console.error(`[DB Service ERROR] ${data}`);
        });

        dbAccessProcess.on('close', (code) => {
            console.log(`[QATO] DB Access service exited with code ${code}.`);
            dbAccessProcess = null;
            reject(new Error(`DB Access service failed to start with code ${code}.`));
        });
    });
}

function stopDbAccessService() {
    if (dbAccessProcess) {
        console.log('[QATO] Stopping DB Access service.');
        dbAccessProcess.kill();
        dbAccessProcess = null;
    }
}

async function runGeneratedKarateTest(featureFileContent: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel, folderPath?: string) {
    console.log('[DEBUG:extension.ts] Running generated Karate test.');
    console.log('[DEBUG:extension.ts] Test execution folder context:', folderPath);
    
    try {
        await startDbAccessService(context);
        
        // Write database configurations to file for Java backend using folder-specific context
        await writeDatabaseConfigurationsToFile(folderPath);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to start DB Access Service: ${error.message}`);
        panel.webview.postMessage({ command: 'testExecutionError', payload: { message: `Failed to start DB Access Service: ${error.message}` } });
        return;
    }

    const projectRootPath = context.extensionPath;
    // Create temp file in project directory to avoid cross-drive path issues on Windows
    const targetDir = path.join(projectRootPath, 'target');
    const tempFeatureFilePath = path.join(targetDir, `qato-temp-${Date.now()}.feature`);

    try {
        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(tempFeatureFilePath, featureFileContent, 'utf8');
        console.log(`[DEBUG:extension.ts] Wrote temporary feature file to: ${tempFeatureFilePath}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create temporary feature file: ${error.message}`);
        return;
    }

    const karateJarPath = path.resolve(projectRootPath, 'resources', `karate-${QATO_CONFIG.KARATE.JAR_VERSION}.jar`);
    const outputDir = path.resolve(projectRootPath, QATO_CONFIG.KARATE.OUTPUT_DIR);
    const absoluteFeaturePath = path.resolve(tempFeatureFilePath);

    const karateProcess = cp.spawn('java', [
        `-Dkarate.options=--output "${outputDir}"`,
        '-jar',
        karateJarPath,
        absoluteFeaturePath,
    ], {
        cwd: projectRootPath
    });

    let stdout = '';
    let stderr = '';

    karateProcess.stdout.on('data', data => {
        stdout += data.toString();
    });
    karateProcess.stderr.on('data', data => {
        stderr += data.toString();
    });

    karateProcess.on('close', code => {
        console.log(`[DEBUG:extension.ts] Karate process exited with code ${code}.`);
        console.log("[DEBUG:extension.ts] --- Captured STDOUT ---");
        console.log(stdout);
        if (stderr) {
            console.log("[DEBUG:extension.ts] --- Captured STDERR ---");
            console.log(stderr);
        }

        const reportPath = path.resolve(projectRootPath, QATO_CONFIG.KARATE.OUTPUT_DIR, 'karate-reports', 'karate-summary-json.txt');
        let testResults = {};

        try {
            if (fs.existsSync(reportPath)) {
                const reportContent = fs.readFileSync(reportPath, 'utf8');
                testResults = JSON.parse(reportContent);
            } else {
                console.warn('[DEBUG:extension.ts] Karate summary report not found. May be a test failure before report generation.');
                testResults = { error: 'Karate summary report not found.' };
            }
        } catch (reportError: any) {
            console.error('[DEBUG:extension.ts] Error reading or parsing Karate report:', reportError);
            testResults = { error: `Failed to process report: ${reportError.message}` };
        }

        // --- Simplified parsing logic ---
        const parsedResults: any[] = [];
        const validationResults: any[] = [];
        const lines = stdout.split('\n');
        let capturing = false;
        let contentBlock = '';
        let captureType = '';

        for (const line of lines) {
            if (line.includes('---QATO_RESULT_START---') || line.includes('---QATO_VALIDATION_START---')) {
                capturing = true;
                contentBlock = '';
                captureType = line.includes('VALIDATION') ? 'validation' : 'result';
                continue;
            }

            if (line.includes('---QATO_RESULT_END---') || line.includes('---QATO_VALIDATION_END---')) {
                if (capturing) {
                    capturing = false;
                    const cleanedLines = contentBlock.split('\n').map(l => {
                        const printPrefix = '[print] ';
                        const startIndex = l.indexOf(printPrefix);
                        return startIndex !== -1 ? l.substring(startIndex + printPrefix.length) : l;
                    });
                    const jsonBlob = cleanedLines.join('\n').trim();

                    try {
                        if (jsonBlob) {
                            const parsedObject = JSON.parse(jsonBlob);
                            if (captureType === 'validation') {
                                validationResults.push(parsedObject);
                            } else {
                                parsedResults.push(parsedObject);
                            }
                        }
                    } catch (e: any) {
                        console.error(`[DEBUG:extension.ts] Failed to parse ${captureType} JSON blob from stdout:`, e.message);
                        console.error('[DEBUG:extension.ts] Faulty JSON blob:', jsonBlob);
                        const errorObject = {
                            stepName: 'Unknown Step (Parse Error)',
                            type: 'error',
                            result: {
                                error: `Failed to parse ${captureType} from test log.`,
                                raw: jsonBlob
                            }
                        };
                        if (captureType === 'validation') {
                            validationResults.push(errorObject);
                        } else {
                            parsedResults.push(errorObject);
                        }
                    }
                }
                continue;
            }

            if (capturing) {
                contentBlock += line + '\n';
            }
        }

        // --- NEW: Detect Karate errors and add as synthetic error results if no QATO result was printed ---
        // Look for Karate errors in stdout and stderr using configurable patterns
        const errorLines: string[] = [];
        const errorRegex = buildErrorRegex();
        const allLogs = stdout + '\n' + stderr;
        console.log("[DEBUG:extension.ts] --- All Logs ---");
        console.log(allLogs);
        allLogs.split('\n').forEach(line => {
            if (errorRegex.test(line)) {
                errorLines.push(line);
            }
        });

        // If Karate exited with error and no parsedResults, add error info
        if (code !== 0 && parsedResults.length === 0 && errorLines.length > 0) {
            // Check if it's a DB error specifically using configurable patterns
            const dbError = isDbError(errorLines);
            const errorType = dbError ? 'DB Error' : 'Karate Error';
            const resultType = dbError ? 'db_error' : 'karate_error';

            parsedResults.push({
                stepName: `Unknown Step (${errorType})`,
                type: resultType,
                result: {
                    error: dbError ? 'Database query failed due to missing variables or invalid query.' : 'Karate execution failed before QATO result block.',
                    karateError: errorLines.join('\n').slice(0, QATO_CONFIG.MAX_ERROR_MESSAGE_LENGTH)
                }
            });
        }

        // If Karate exited with error and no validationResults, add error info
        if (code !== 0 && validationResults.length === 0 && errorLines.length > 0) {
            // Check if it's a DB error specifically using configurable patterns
            const dbError = isDbError(errorLines);

            validationResults.push({
                id: 'karate-error',
                status: 'error',
                target: dbError ? 'Database Query' : 'Karate Execution',
                dataType: 'string',
                expectedValue: '',
                actualValue: '',
                message: dbError ? 'Database query failed due to missing variables or invalid query.' : 'Karate execution failed before QATO validation block.',
                timestamp: new Date().toISOString(),
                karateError: errorLines.join('\n').slice(0, QATO_CONFIG.MAX_ERROR_MESSAGE_LENGTH)
            });
        }

        console.log("[DEBUG:extension.ts] --- Parsed Results (Raw from Extension) ---");
        console.log(JSON.stringify(parsedResults, null, 2));
        console.log("[DEBUG:extension.ts] --- Validation Results ---");
        console.log(JSON.stringify(validationResults, null, 2));

        panel.webview.postMessage({
            command: 'testResult',
            payload: { ...testResults, parsedResults, validationResults } // Send raw JSON strings to the webview
        });

        if (code !== 0) {
            vscode.window.showErrorMessage(`Karate test run failed. See console logs for details.`);
        }

        try {
            fs.unlinkSync(tempFeatureFilePath);
        } catch (cleanupError: any) {
            console.error(`Failed to clean up temporary file: ${cleanupError.message}`);
        }
    });
}/**

 * Inject database configurations to the Java backend
 */
async function writeDatabaseConfigurationsToFile(folderPath?: string): Promise<void> {
    if (!databaseConfigManager) {
        console.warn('[DEBUG:extension.ts] Database config manager not initialized, skipping configuration file write');
        return;
    }

    try {
        // Determine the configuration resolution path
        let configPath: string;
        
        if (folderPath) {
            // Use the specific folder path for test execution
            configPath = folderPath;
            console.log('[DEBUG:extension.ts] Resolving database configuration for folder:', folderPath);
        } else {
            // Fallback to workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            configPath = workspaceRoot || '';
            console.log('[DEBUG:extension.ts] No folder context provided, using workspace root:', configPath);
        }

        // Resolve configuration for the specific path
        const resolvedConfig = await databaseConfigManager.resolveConfig(configPath);
        
        console.log('[DEBUG:extension.ts] Writing database configurations to file for path:', configPath);
        console.log('[DEBUG:extension.ts] Resolved configuration:', resolvedConfig);

        // Write configuration to a file that Java backend can read
        const configPayload = {
            databases: resolvedConfig,
            folderContext: folderPath,
            timestamp: new Date().toISOString()
        };

        const configFilePath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || __dirname, 'target', 'qato-db-config.json');
        
        // Ensure target directory exists
        const targetDir = path.dirname(configFilePath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(configFilePath, JSON.stringify(configPayload, null, 2));
        console.log('[DEBUG:extension.ts] Database configuration written to:', configFilePath);

        // Also send configuration update to Java backend if it's running
        await sendConfigurationUpdateToJavaBackend(configPayload);
        
        // Request configuration reload from Java backend to ensure latest config is used
        await requestConfigurationReloadFromJavaBackend();

    } catch (error: any) {
        console.error('[DEBUG:extension.ts] Failed to write database configurations to file:', error.message);
        // Don't throw the error - let the test continue with default configurations
        vscode.window.showWarningMessage(`Failed to write database configurations: ${error.message}. Using default configurations.`);
    }
}

/**
 * Send configuration update to Java backend
 */
async function sendConfigurationUpdateToJavaBackend(configPayload: any): Promise<void> {
    try {
        // Check if the Java backend is running by trying to reach the health endpoint
        const healthUrl = `http://localhost:${QATO_CONFIG.DB_SERVICE.PORT}/actuator/health`;
        
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 2000);
        
        const healthResponse = await fetch(healthUrl, {
            method: 'GET',
            signal: healthController.signal
        });
        
        clearTimeout(healthTimeout);

        if (!healthResponse.ok) {
            console.log('[DEBUG:extension.ts] Java backend not available, skipping configuration update');
            return;
        }

        // Send configuration update to Java backend
        const configUrl = `http://localhost:${QATO_CONFIG.DB_SERVICE.PORT}/config/update`;
        
        const configController = new AbortController();
        const configTimeout = setTimeout(() => configController.abort(), 5000);
        
        const response = await fetch(configUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(configPayload),
            signal: configController.signal
        });
        
        clearTimeout(configTimeout);

        if (response.ok) {
            const result = await response.json();
            console.log('[DEBUG:extension.ts] Configuration update sent to Java backend:', result);
        } else {
            console.warn('[DEBUG:extension.ts] Failed to send configuration update to Java backend:', response.status, response.statusText);
        }

    } catch (error: any) {
        console.log('[DEBUG:extension.ts] Could not send configuration update to Java backend (service may not be running):', error.message);
        // This is not a critical error - the configuration file is still written
    }
}

/**
 * Request configuration reload from Java backend to ensure latest config is used
 */
async function requestConfigurationReloadFromJavaBackend(): Promise<void> {
    try {
        // Send reload request to Java backend using the existing config/update endpoint
        const reloadUrl = `http://localhost:${QATO_CONFIG.DB_SERVICE.PORT}/config/update`;
        
        const reloadController = new AbortController();
        const reloadTimeout = setTimeout(() => reloadController.abort(), 5000);
        
        const response = await fetch(reloadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reloadFromFile: true }),
            signal: reloadController.signal
        });
        
        clearTimeout(reloadTimeout);

        if (response.ok) {
            const result = await response.json();
            console.log('[DEBUG:extension.ts] Configuration reload requested from Java backend:', result);
        } else {
            console.warn('[DEBUG:extension.ts] Failed to request configuration reload from Java backend:', response.status, response.statusText);
        }

    } catch (error: any) {
        console.log('[DEBUG:extension.ts] Could not request configuration reload from Java backend (service may not be running):', error.message);
        // This is not a critical error - the configuration file is still available
    }
}

