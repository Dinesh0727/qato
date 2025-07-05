import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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
            message => {
                console.log('[DEBUG:extension.ts] Received message from webview:', message);
                if (message.command === 'runGeneratedTest') {
                    runGeneratedKarateTest(message.payload.featureFileContent, context, panel);
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
        const springBootJarPath = path.join(projectRootPath, 'java-utils', 'qa-tool-orchaestrator', 'target', 'qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar');

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
    console.log('[DEBUG:extension.ts] Running generated Karate test with content:', featureFileContent);
    try {
        await startDbAccessService(context);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to start DB Access Service: ${error.message}`);
        return;
    }

    const projectRootPath = context.extensionPath;
    const tempFeatureFilePath = path.join(os.tmpdir(), 'qato-temp.feature');

    try {
        fs.writeFileSync(tempFeatureFilePath, featureFileContent, 'utf8');
        console.log(`[DEBUG:extension.ts] Wrote feature file to: ${tempFeatureFilePath}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create temporary feature file: ${error.message}`);
        return;
    }

    const karateJarPath = path.join(projectRootPath, 'resources', 'karate-1.5.1.jar');
    const outputChannel = vscode.window.createOutputChannel("Karate Results");
    outputChannel.show();
    outputChannel.clear();
    outputChannel.appendLine(`[QATO] Running generated test: ${tempFeatureFilePath}`);
    outputChannel.appendLine('---\n');

    const karateProcess = cp.spawn('java', [
        '-Dkarate.host=all',
        '-cp',
        karateJarPath,
        'com.intuit.karate.Main',
        tempFeatureFilePath,
        '--output',
        path.join(projectRootPath, 'target')
    ], {
        cwd: projectRootPath
    });

    let stdout = '';
    karateProcess.stdout.on('data', data => {
        const output = data.toString();
        outputChannel.append(output);
        stdout += output;
    });
    karateProcess.stderr.on('data', data => outputChannel.append(data.toString()));

    karateProcess.on('close', code => {
        outputChannel.append(`\n---\n[QATO] Process exited with code ${code}`);
        console.log(`[DEBUG:extension.ts] Karate process exited with code ${code}.`);

        const reportPath = path.join(projectRootPath, 'target', 'karate-reports', 'karate-summary-json.txt');
        let testResults = {};

        try {
            if (fs.existsSync(reportPath)) {
                const reportContent = fs.readFileSync(reportPath, 'utf8');
                testResults = JSON.parse(reportContent);
                console.log('[DEBUG:extension.ts] Parsed Karate report:', testResults);
            } else {
                throw new Error('Karate summary report not found.');
            }
        } catch (reportError: any) {
            console.error('Error reading or parsing Karate report:', reportError);
            vscode.window.showErrorMessage(`Failed to process Karate report: ${reportError.message}`);
            testResults = { error: `Failed to process report: ${reportError.message}` };
        }

        const dbResults: any[] = [];
        const regex = /(?:SQL Result:|Redis Result:|Clickhouse Result:)\s*(\{[\s\S]*?\})/gm;
        let match;
        while ((match = regex.exec(stdout)) !== null) {
            try {
                dbResults.push(JSON.parse(match[1]));
            } catch (e) {
                console.error("Failed to parse DB result JSON:", e);
                console.error("Problematic JSON string:", match[1]);
            }
        }

        console.log("--- Captured STDOUT ---");
        console.log(stdout);
        console.log("--- Parsed DB Results ---");
        console.log(dbResults);

        panel.webview.postMessage({
            command: 'testResult',
            payload: { ...testResults, dbResults }
        });

        if (code !== 0) {
            vscode.window.showErrorMessage(`Karate test run failed. See "Karate Results" output for details.`);
        }

        try {
            fs.unlinkSync(tempFeatureFilePath);
            console.log(`[DEBUG:extension.ts] Deleted temporary feature file: ${tempFeatureFilePath}`);
        } catch (cleanupError: any) {
            console.error(`Failed to clean up temporary file: ${cleanupError.message}`);
        }
    });
}