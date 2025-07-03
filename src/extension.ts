import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {
    let showPanelCommand = vscode.commands.registerCommand('qato.showPanel', () => {
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

        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'runGeneratedTest') {
                    runGeneratedKarateTest(message.payload.featureFileContent, context, panel);
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(showPanelCommand);
}

function runGeneratedKarateTest(featureFileContent: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    const projectRootPath = context.extensionPath;
    const tempFeatureFilePath = path.join(os.tmpdir(), 'qato-temp.feature');

    try {
        fs.writeFileSync(tempFeatureFilePath, featureFileContent, 'utf8');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create temporary feature file: ${error.message}`);
        return;
    }

    const karateJarPath = path.join(projectRootPath, 'resources', 'karate-1.5.1.jar');
    const utilsJarPath = path.join(projectRootPath, 'resources', 'java-utils.jar');
    const mysqlJarPath = path.join(projectRootPath, 'resources', 'mysql-connector-j-8.0.33.jar');
    const classPath = [karateJarPath, utilsJarPath, mysqlJarPath].join(path.delimiter);

    const outputChannel = vscode.window.createOutputChannel("Karate Results");
    outputChannel.show();
    outputChannel.clear();
    outputChannel.appendLine(`[QATO] Running generated test: ${tempFeatureFilePath}`);
    outputChannel.appendLine('---\n');

    const karateProcess = cp.spawn('java', [
        '-Dkarate.host=all',
        '-cp',
        classPath,
        'com.intuit.karate.Main',
        tempFeatureFilePath,
        '--output',
        path.join(projectRootPath, 'target') // Ensure reports go to a consistent directory
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

        const reportPath = path.join(projectRootPath, 'target', 'karate-reports', 'karate-summary-json.txt');
        let testResults = {};

        try {
            if (fs.existsSync(reportPath)) {
                const reportContent = fs.readFileSync(reportPath, 'utf8');
                testResults = JSON.parse(reportContent);
            } else {
                throw new Error('Karate summary report not found.');
            }
        } catch (reportError: any) {
            console.error('Error reading or parsing Karate report:', reportError);
            vscode.window.showErrorMessage(`Failed to process Karate report: ${reportError.message}`);
            testResults = { error: `Failed to process report: ${reportError.message}` };
        }

        // Parse stdout for DB results
        const dbResults: any[] = [];
        const regex = /(?:SQL Result:|Redis Result:|Clickhouse Result:)\s*(\{[\s\S]*?\})/gm;
        let match;
        while ((match = regex.exec(stdout)) !== null) {
            try {
                // match[1] contains the captured JSON string
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

        // Clean up the temporary file
        try {
            fs.unlinkSync(tempFeatureFilePath);
        } catch (cleanupError: any) {
            // Log cleanup error but don't bother the user
            console.error(`Failed to clean up temporary file: ${cleanupError.message}`);
        }
    });
}
