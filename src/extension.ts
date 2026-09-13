import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { QATO_CONFIG, buildErrorRegex, isDbError } from './config';
import { WorkspaceManager } from './workspaceManager';
import { WorkspaceMessage, WorkspaceTree } from './workspaceTypes';

let dbAccessProcess: cp.ChildProcess | null = null;
let workspaceManager: WorkspaceManager | null = null;

/**
 * Extract JSON from a log line that may contain Karate log prefixes
 * Handles patterns like: "00:22:37.746 [main]  INFO  com.intuit.karate - {json}"
 */
function extractJsonFromLogLine(line: string): string {
    // First, try to remove [print] prefix if present
    const printPrefix = '[print] ';
    let cleaned = line.indexOf(printPrefix) !== -1 
        ? line.substring(line.indexOf(printPrefix) + printPrefix.length) 
        : line;
    
    // Try to find JSON start markers
    // Look for patterns like " - {" or " - [" or just "{" or "["
    // First try to find " - {" or " - [" pattern (most common in Karate logs)
    const dashPattern = cleaned.match(/ - (\{|\[)/);
    if (dashPattern && dashPattern.index !== undefined) {
        // Found " - {" or " - [", extract from the brace/bracket
        const bracePos = dashPattern[0].indexOf('{');
        const bracketPos = dashPattern[0].indexOf('[');
        const jsonStart = bracePos !== -1
            ? dashPattern.index + bracePos
            : dashPattern.index + bracketPos;
        return cleaned.substring(jsonStart).trim();
    }
    
    // Fallback: look for just "{" or "["
    const braceIndex = cleaned.indexOf('{');
    const bracketIndex = cleaned.indexOf('[');
    
    if (braceIndex !== -1 && (bracketIndex === -1 || braceIndex < bracketIndex)) {
        return cleaned.substring(braceIndex).trim();
    } else if (bracketIndex !== -1) {
        return cleaned.substring(bracketIndex).trim();
    }
    
    // If no pattern found, return the cleaned line as-is
    return cleaned.trim();
}

/**
 * Extract and combine JSON from multiple log lines
 * Handles multi-line JSON that may be split across log entries
 */
function extractJsonFromLogLines(lines: string[]): string {
    // First, try to extract JSON from each line and combine
    const extractedParts = lines.map(extractJsonFromLogLine).filter(part => part.length > 0);
    
    if (extractedParts.length === 0) {
        return '';
    }
    
    // Join the parts - they should form valid JSON
    let combined = extractedParts.join('\n').trim();
    
    // If the combined string doesn't start with { or [, try to find the first JSON object/array
    if (!combined.startsWith('{') && !combined.startsWith('[')) {
        const firstBrace = combined.indexOf('{');
        const firstBracket = combined.indexOf('[');
        
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            combined = combined.substring(firstBrace);
        } else if (firstBracket !== -1) {
            combined = combined.substring(firstBracket);
        }
    }
    
    return combined;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG:extension.ts] Activating extension.');
    
    // Initialize workspace manager
    workspaceManager = new WorkspaceManager();
    
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
    });

    // Load step templates on bootup after workspace initialization
    try {
        const templatesResult = await workspaceManager.readStepTemplates();
        const templates = templatesResult.success && templatesResult.data ? templatesResult.data : [];
        panel.webview.postMessage({
            command: 'templatesLoaded',
            payload: { templates }
        });
    } catch (e) {
        // Ignore template load errors on boot; UI can request explicitly later
    }
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
            runGeneratedKarateTest(message.payload.featureFileContent, context, panel, message.payload.testContext);
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
            console.log('[DEBUG:extension.ts] Updating global config:', JSON.stringify(config, null, 2));
            const rootUri = workspaceManager.getRootUri();
            
            if (!rootUri) {
                console.error('[DEBUG:extension.ts] No workspace root available for global config update');
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'No workspace root available' }
                });
                break;
            }

            const result = await workspaceManager.updateGlobalConfig(rootUri, config);
            if (!result.success) {
                console.error('[DEBUG:extension.ts] Failed to update global config:', result.error);
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: result.error || 'Failed to update global config' }
                });
            } else {
                console.log('[DEBUG:extension.ts] Global config updated successfully, refreshing workspace tree...');
                // Immediately refresh workspace tree after successful global config update
                const treeResult = await workspaceManager.getWorkspaceTree(rootUri);
                if (treeResult.success && treeResult.data) {
                    console.log('[DEBUG:extension.ts] Workspace tree refreshed, sending to webview');
                    panel.webview.postMessage({
                        command: 'fileSystemChanged',
                        payload: { workspaceTree: treeResult.data }
                    });
                } else {
                    console.error('[DEBUG:extension.ts] Failed to refresh workspace tree after global config update');
                }
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
            } else {
                // Immediately refresh workspace tree after successful folder config update
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

        case 'initializeWorkspace': {
            await initializeWorkspaceForPanel(panel);
            break;
        }

        case 'saveStepTemplate': {
            const { template } = message.payload;
            try {
                const listResult = await workspaceManager.readStepTemplates();
                const templates = listResult.success && listResult.data ? listResult.data : [];
                const updatedTemplates = [...templates, template];
                const writeResult = await workspaceManager.writeStepTemplates(updatedTemplates);
                if (!writeResult.success) {
                    throw new Error(writeResult.error || 'Failed to write templates');
                }
                panel.webview.postMessage({
                    command: 'templateSaved',
                    payload: { template }
                });
            } catch (error) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'Failed to save template' }
                });
            }
            break;
        }

        case 'loadStepTemplates': {
            try {
                const listResult = await workspaceManager.readStepTemplates();
                const templates = listResult.success && listResult.data ? listResult.data : [];
                panel.webview.postMessage({
                    command: 'templatesLoaded',
                    payload: { templates }
                });
            } catch (error) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'Failed to load templates' }
                });
            }
            break;
        }

        case 'updateStepTemplate': {
            const { templateId, updates } = message.payload;
            try {
                const listResult = await workspaceManager.readStepTemplates();
                const templates = listResult.success && listResult.data ? listResult.data : [];
                const updatedTemplates = templates.map((template: any) => 
                    template.id === templateId ? { ...template, ...updates, updatedAt: new Date().toISOString() } : template
                );
                const writeResult = await workspaceManager.writeStepTemplates(updatedTemplates);
                if (!writeResult.success) {
                    throw new Error(writeResult.error || 'Failed to write templates');
                }
                panel.webview.postMessage({
                    command: 'templateUpdated',
                    payload: { templateId, template: updatedTemplates.find((t: any) => t.id === templateId) }
                });
            } catch (error) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'Failed to update template' }
                });
            }
            break;
        }

        case 'deleteStepTemplate': {
            const { templateId } = message.payload;
            try {
                const listResult = await workspaceManager.readStepTemplates();
                const templates = listResult.success && listResult.data ? listResult.data : [];
                const updatedTemplates = templates.filter((template: any) => template.id !== templateId);
                const writeResult = await workspaceManager.writeStepTemplates(updatedTemplates);
                if (!writeResult.success) {
                    throw new Error(writeResult.error || 'Failed to write templates');
                }
                panel.webview.postMessage({
                    command: 'templateDeleted',
                    payload: { templateId }
                });
            } catch (error) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'Failed to delete template' }
                });
            }
            break;
        }

        case 'clearAllTemplates': {
            try {
                const writeResult = await workspaceManager.writeStepTemplates([]);
                if (!writeResult.success) {
                    throw new Error(writeResult.error || 'Failed to write templates');
                }
                panel.webview.postMessage({
                    command: 'templatesCleared',
                    payload: {}
                });
            } catch (error) {
                panel.webview.postMessage({
                    command: 'workspaceError',
                    payload: { error: 'Failed to clear templates' }
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

async function runGeneratedKarateTest(featureFileContent: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel, testContext?: any) {
    console.log('[DEBUG:extension.ts] Running generated Karate test.');
    console.log('[DEBUG:extension.ts] Test context:', testContext);
    
    try {
        await startDbAccessService(context);
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
            if (line.includes('---QATO_RESULT_START---') || line.includes('---QATO_VALIDATION_START---') || line.includes('---QATO_DB_ERROR_START---')) {
                capturing = true;
                contentBlock = '';
                if (line.includes('VALIDATION')) {
                    captureType = 'validation';
                } else if (line.includes('DB_ERROR')) {
                    captureType = 'db_error';
                } else {
                    captureType = 'result';
                }
                continue;
            }

            if (line.includes('---QATO_RESULT_END---') || line.includes('---QATO_VALIDATION_END---') || line.includes('---QATO_DB_ERROR_END---')) {
                if (capturing) {
                    capturing = false;
                    const contentLines = contentBlock.split('\n').filter(l => l.trim().length > 0);
                    const jsonBlob = extractJsonFromLogLines(contentLines);

                    try {
                        if (jsonBlob) {
                            const parsedObject = JSON.parse(jsonBlob);
                            if (captureType === 'validation') {
                                validationResults.push(parsedObject);
                            } else if (captureType === 'db_error') {
                                // DB errors go to parsedResults with type 'db_error'
                                parsedResults.push(parsedObject);
                            } else {
                                parsedResults.push(parsedObject);
                            }
                        }
                    } catch (e: any) {
                        console.error(`[DEBUG:extension.ts] Failed to parse ${captureType} JSON blob from stdout:`, e.message);
                        console.error('[DEBUG:extension.ts] Faulty JSON blob:', jsonBlob);
                        console.error('[DEBUG:extension.ts] Raw content block:', contentBlock);
                        
                        // Try to extract JSON one more time with a more aggressive approach
                        let fallbackJson = '';
                        try {
                            // Look for JSON object in the raw content
                            const jsonMatch = contentBlock.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                fallbackJson = jsonMatch[0];
                                const parsedObject = JSON.parse(fallbackJson);
                                if (captureType === 'validation') {
                                    validationResults.push(parsedObject);
                                } else if (captureType === 'db_error') {
                                    parsedResults.push(parsedObject);
                                } else {
                                    parsedResults.push(parsedObject);
                                }
                                console.log(`[DEBUG:extension.ts] Successfully parsed ${captureType} using fallback extraction`);
                                continue;
                            }
                        } catch (fallbackError: any) {
                            console.error(`[DEBUG:extension.ts] Fallback extraction also failed:`, fallbackError.message);
                        }
                        
                        const errorObject = {
                            stepName: 'Unknown Step (Parse Error)',
                            type: 'error',
                            result: {
                                error: `Failed to parse ${captureType} from test log.`,
                                raw: jsonBlob || contentBlock
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
            payload: { ...testResults, parsedResults, validationResults, testCaseId: testContext?.testCaseId } // Send raw JSON strings to the webview
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
}