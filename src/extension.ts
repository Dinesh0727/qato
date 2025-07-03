import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('qato.runHardcodedTest', () => {
        const projectRootPath = context.extensionPath;

        // Get paths to our bundled resources
        const karateJarPath = path.join(projectRootPath, 'resources', 'karate-1.5.1.jar');
        const utilsJarPath = path.join(projectRootPath, 'resources', 'java-utils.jar');
        const featureFilePath = path.join(projectRootPath, 'sample.feature');

        const mysqlJarPath = path.join(projectRootPath, 'resources', 'mysql-connector-j-8.0.33.jar');

        // The -cp flag adds our utils JAR to the classpath so Karate can find the Java code
        // path.delimiter will be ':' on macOS/Linux and ';' on Windows
        const classPath = [karateJarPath, utilsJarPath, mysqlJarPath].join(path.delimiter);

        const karateProcess = cp.spawn('java', [
            '-Dkarate.host=all', // Allow access to Java classes
            '-cp',
            classPath,
            'com.intuit.karate.Main',
            featureFilePath
        ], {
            cwd: projectRootPath // Set the working directory to the project root
        });

        // Create an output channel to show the results
        const outputChannel = vscode.window.createOutputChannel("Karate Results");
        outputChannel.show();
        outputChannel.clear(); // Clear previous results

        outputChannel.appendLine(`[QATO] Running test: ${featureFilePath}`);
        outputChannel.appendLine(`[QATO] Classpath: ${classPath}`);
        outputChannel.appendLine('---');

        karateProcess.stdout.on('data', data => outputChannel.append(data.toString()));
        karateProcess.stderr.on('data', data => outputChannel.append(data.toString()));
        karateProcess.on('close', code => {
            outputChannel.append(`\n---\n[QATO] Process exited with code ${code}`);
            if (code === 0) {
                vscode.window.showInformationMessage('Karate test run finished successfully!');
            } else {
                vscode.window.showErrorMessage(`Karate test run failed. See "Karate Results" output for details.`);
            }
        });
    });

    context.subscriptions.push(disposable);

    let showPanelCommand = vscode.commands.registerCommand('qato.showPanel', () => {
        const panel = vscode.window.createWebviewPanel(
            'qatoPanel', // Identifies the type of the webview. Used internally
            'QATO Visual Builder', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true, // Enable JavaScript in the webview
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist-ui'))] // Allow loading resources from dist-ui
            }
        );

        const distPath = path.join(context.extensionPath, 'dist-ui');
        const htmlPath = path.join(distPath, 'index.html');
        const htmlContent = require('fs').readFileSync(htmlPath, 'utf8');

        // Replace relative paths in HTML with webview-compatible URIs
        let finalHtml = htmlContent.replace(/\/assets\//g, `${panel.webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'assets')))}/`);

        // Inject the VS Code API script
        finalHtml = finalHtml.replace(
            '<body>',
            `<body>
                <script>
                    const vscode = acquireVsCodeApi();
                </script>`
        );

        panel.webview.html = finalHtml;

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'runGeneratedTest':
                        const featureFileContent = message.payload.featureFileContent;
                        const projectRootPath = context.extensionPath;
                        const tempFeatureFilePath = path.join(projectRootPath, 'temp.feature');

                        try {
                            require('fs').writeFileSync(tempFeatureFilePath, featureFileContent, 'utf8');

                            const karateJarPath = path.join(projectRootPath, 'resources', 'karate-1.5.1.jar');
                            const utilsJarPath = path.join(projectRootPath, 'resources', 'java-utils.jar');
                            const mysqlJarPath = path.join(projectRootPath, 'resources', 'mysql-connector-j-8.0.33.jar');
                            const classPath = [karateJarPath, utilsJarPath, mysqlJarPath].join(path.delimiter);

                            const outputChannel = vscode.window.createOutputChannel("Karate Results");
                            outputChannel.show();
                            outputChannel.clear();

                            outputChannel.appendLine(`[QATO] Running generated test: ${tempFeatureFilePath}`);
                            outputChannel.appendLine(`[QATO] Classpath: ${classPath}`);
                            outputChannel.appendLine('---');

                            const karateProcess = cp.spawn('java', [
                                '-Dkarate.host=all',
                                '-cp',
                                classPath,
                                'com.intuit.karate.Main',
                                tempFeatureFilePath
                            ], {
                                cwd: projectRootPath
                            });

                            karateProcess.stdout.on('data', data => outputChannel.append(data.toString()));
                            karateProcess.stderr.on('data', data => outputChannel.append(data.toString()));

                            karateProcess.on('close', code => {
                                outputChannel.append(`\n---\n[QATO] Process exited with code ${code}`);
                                if (code === 0) {
                                    vscode.window.showInformationMessage('Karate test run finished successfully!');
                                } else {
                                    vscode.window.showErrorMessage(`Karate test run failed. See "Karate Results" output for details.`);
                                }
                                // Clean up temporary file
                                require('fs').unlinkSync(tempFeatureFilePath);
                            });
                        } catch (error: any) {
                            vscode.window.showErrorMessage(`Failed to run test: ${error.message || error}`);
                            if (require('fs').existsSync(tempFeatureFilePath)) {
                                require('fs').unlinkSync(tempFeatureFilePath);
                            }
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(showPanelCommand);
}