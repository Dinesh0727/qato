import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { QATO_CONFIG, buildErrorRegex, isDbError } from './config';

let dbAccessProcess: cp.ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG:extension.ts] Activating extension.');
    let showPanelCommand = vscode.commands.registerCommand('qato.showPanel', () => {
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

        let finalHtml = htmlContent.replace( /\/assets\//g, `${panel.webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'assets')))}/`);
        finalHtml = finalHtml.replace(
            '<body>',
            `<body><script>const vscode = acquireVsCodeApi();</script>`
        );
        panel.webview.html = finalHtml;

        panel.webview.onDidReceiveMessage(
            async message => { // Make the handler async
                console.log('[DEBUG:extension.ts] Received message from webview:', message);
                switch (message.command) {
                    case 'runGeneratedTest':
                        runGeneratedKarateTest(message.payload.featureFileContent, context, panel);
                        break;

                    // --- ADD THIS NEW CASE ---
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
                }
            },
            undefined,
            context.subscriptions
        );

        panel.onDidDispose(() => {
            console.log('[DEBUG:extension.ts] Webview panel disposed.');
            stopDbAccessService();
        });
    });

    context.subscriptions.push(showPanelCommand);
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

async function runGeneratedKarateTest(featureFileContent: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    console.log('[DEBUG:extension.ts] Running generated Karate test.');
    try {
        await startDbAccessService(context);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to start DB Access Service: ${error.message}`);
        panel.webview.postMessage({ command: 'testExecutionError', payload: { message: `Failed to start DB Access Service: ${error.message}` } });
        return;
    }

    const projectRootPath = context.extensionPath;
    const tempFeatureFilePath = path.join(os.tmpdir(), `qato-temp-${Date.now()}.feature`);

    try {
        fs.writeFileSync(tempFeatureFilePath, featureFileContent, 'utf8');
        console.log(`[DEBUG:extension.ts] Wrote temporary feature file to: ${tempFeatureFilePath}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create temporary feature file: ${error.message}`);
        return;
    }

            const karateJarPath = path.join(projectRootPath, 'resources', `karate-${QATO_CONFIG.KARATE.JAR_VERSION}.jar`);
    const karateProcess = cp.spawn('java', [
        '-Dkarate.options=--output ' + path.join(projectRootPath, QATO_CONFIG.KARATE.OUTPUT_DIR),
        '-jar',
        karateJarPath,
        tempFeatureFilePath,
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

        const reportPath = path.join(projectRootPath, QATO_CONFIG.KARATE.OUTPUT_DIR, 'karate-reports', 'karate-summary-json.txt');
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
}