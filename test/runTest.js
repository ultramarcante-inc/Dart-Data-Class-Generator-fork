const fs = require('fs');
const os = require('os');
const path = require('path');

const { runTests } = require('vscode-test');

async function main() {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-data-class-generator-test-'));
    try {
        await runTests({
            extensionDevelopmentPath: path.resolve(__dirname, '..'),
            extensionTestsPath: path.resolve(__dirname, 'suite', 'index'),
            vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH,
            launchArgs: [
                '--user-data-dir=' + path.join(testDataDir, 'user-data'),
                '--extensions-dir=' + path.join(testDataDir, 'extensions'),
                '--disable-gpu'
            ]
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exitCode = 1;
    } finally {
        fs.rmSync(testDataDir, { recursive: true, force: true });
    }
}

main();
