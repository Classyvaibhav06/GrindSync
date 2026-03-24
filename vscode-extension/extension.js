const vscode = require('vscode');
const https = require('https');

let intervalId = null;

function activate(context) {
    console.log('GrindSync Tracker is now active!');

    // Start the tracker loop immediately
    startTracking();

    // Command to manually restart if needed
    let disposable = vscode.commands.registerCommand('grindsync-tracker.start', () => {
        vscode.window.showInformationMessage('GrindSync Tracking Started!');
        startTracking();
    });

    context.subscriptions.push(disposable);
}

function startTracking() {
    if (intervalId) clearInterval(intervalId);

    // Run this check every 60 seconds (60000ms)
    intervalId = setInterval(() => {
        const apiKey = vscode.workspace.getConfiguration('grindsync').get('apiKey');
        
        // If the VS Code window is currently focused/active AND they have an API key
        if (vscode.window.state.focused && apiKey) {
            
            // Ping your localhost backend (you will change this to https://socialgrind.com once deployed)
            const postData = JSON.stringify({ token: apiKey });
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/telemetry/screentime',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const http = require('http');
            const req = http.request(options, (res) => {
                // Sent successfully!
            });

            req.on('error', (e) => {
                // Usually fails if localhost is not running 
            });

            req.write(postData);
            req.end();
        }
    }, 60000);
}

function deactivate() {
    if (intervalId) clearInterval(intervalId);
}

module.exports = {
    activate,
    deactivate
}
