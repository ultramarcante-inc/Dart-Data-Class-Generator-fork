const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const vscode = require('vscode');
const extension = require('../../src/extension');

const command = 'dart_data_class.generate.from_props';
const classSource = 'class Person {\n  final String name;\n  final int age;\n}\n';

async function openDart(content) {
    const document = await vscode.workspace.openTextDocument({ language: 'dart', content });
    await vscode.window.showTextDocument(document);
    return document;
}

function occurrences(text, fragment) {
    return text.split(fragment).length - 1;
}

function analyzeDart(target) {
    const dartCommand = process.platform === 'win32' ? 'cmd.exe' : 'dart';
    const dartArgs = process.platform === 'win32'
        ? ['/d', '/c', 'dart', 'analyze', target]
        : ['analyze', target];
    const result = spawnSync(dartCommand, dartArgs, {
        encoding: 'utf8',
        timeout: 60000
    });
    if (result.error) throw result.error;
    assert.strictEqual(result.status, 0, result.stdout + result.stderr);
}

async function setSetting(key, value) {
    await vscode.workspace.getConfiguration().update(
        'dart_data_class_generator.' + key,
        value,
        vscode.ConfigurationTarget.Global
    );
}

suite('Dart Data Class Generator', () => {
    suiteSetup(async () => {
        const installed = vscode.extensions.getExtension('ultramarcante.dart-data-class-generator-fork');
        assert.ok(installed, 'The development extension must be loaded');
        await installed.activate();
    });

    test('converts camelCase, PascalCase and acronyms to snake_case', () => {
        for (const [source, expected] of [
            ['firstName', 'first_name'],
            ['FirstName', 'first_name'],
            ['HTTPCode', 'http_code'],
            ['userID', 'user_id'],
            ['item2Value', 'item2_value'],
            ['first_name', 'first_name'],
            ['', '']
        ]) {
            assert.strictEqual(extension.toSnakeCase(source), expected);
        }
    });

    test('uses snake_case Map keys for Dart properties when enabled and original keys when disabled', async () => {
        const source = 'class Person {\n  final String firstName;\n  final int userID;\n}\n';
        try {
            for (const enabled of [true, false]) {
                await setSetting('json.snakeCase', enabled);
                const document = await openDart(source);
                await vscode.commands.executeCommand(command);
                const output = document.getText();
                const firstKey = enabled ? 'first_name' : 'firstName';
                const idKey = enabled ? 'user_id' : 'userID';

                assert.ok(output.includes("'" + firstKey + "': firstName"), output);
                assert.ok(output.includes("'" + idKey + "': userID"), output);
                assert.ok(output.includes("map['" + firstKey + "']"), output);
                assert.ok(output.includes("map['" + idKey + "']"), output);
                assert.ok(output.includes('String toJson() => json.encode(toMap())'), output);
                assert.ok(output.includes('Person.fromMap(json.decode(source)'), output);
                assert.ok(output.includes('final String firstName;'), output);
            }
        } finally {
            await setSetting('json.snakeCase', undefined);
        }
    });

    test('normalizes Dart fields from JSON while respecting original or snake_case keys', async () => {
        const json = '{"first_name":"Ada","HTTPCode":200,"lastName":"Lovelace"}';
        const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-dcg-snake-'));
        try {
            for (const enabled of [true, false]) {
                await setSetting('json.snakeCase', enabled);
                const document = await openDart(json);
                const reader = new extension.JsonReader(json, 'person');
                assert.strictEqual(await reader.error, null);
                await reader.commitJson({ report() {} }, false);
                const output = document.getText();

                for (const field of ['firstName', 'httpCode', 'lastName']) {
                    assert.ok(output.includes('final ' + (field === 'httpCode' ? 'int' : 'String') + ' ' + field + ';'), output);
                }
                const keys = enabled
                    ? ['first_name', 'http_code', 'last_name']
                    : ['first_name', 'HTTPCode', 'lastName'];
                for (const key of keys) {
                    assert.ok(output.includes("'" + key + "': "), output);
                    assert.ok(output.includes("map['" + key + "']"), output);
                }
                if (enabled) {
                    fs.writeFileSync(path.join(fixtureDir, 'person.dart'), output);
                    analyzeDart(fixtureDir);
                }
            }
        } finally {
            await setSetting('json.snakeCase', undefined);
            fs.rmSync(fixtureDir, { recursive: true, force: true });
        }
    });

    test('rejects JSON keys that collide after Dart or snake_case normalization', async () => {
        try {
            for (const enabled of [true, false]) {
                await setSetting('json.snakeCase', enabled);
                for (const json of [
                    '{"first_name":"Ada","firstName":"Bob"}',
                    '{"HTTPCode":200,"http_code":201}'
                ]) {
                    const reader = new extension.JsonReader(json, 'person');
                    const error = await reader.error;
                    assert.ok(error && error.includes('collides'), String(error));
                    assert.strictEqual(reader.files.length, 0);
                }
            }
        } finally {
            await setSetting('json.snakeCase', undefined);
        }
    });

    test('preserves imported JSON keys when regenerating with snake_case disabled', async () => {
        const json = '{"HTTPCode":200}';
        try {
            await setSetting('json.snakeCase', false);
            const document = await openDart(json);
            const reader = new extension.JsonReader(json, 'person');
            assert.strictEqual(await reader.error, null);
            await reader.commitJson({ report() {} }, false);
            assert.ok(document.getText().includes('// json_key: "HTTPCode"'));
            assert.ok(document.getText().includes("'HTTPCode': httpCode"));

            await vscode.commands.executeCommand(command);
            assert.ok(document.getText().includes("'HTTPCode': httpCode"), document.getText());
            assert.ok(document.getText().includes("map['HTTPCode']"), document.getText());

            await setSetting('json.snakeCase', true);
            await vscode.commands.executeCommand(command);
            assert.ok(document.getText().includes("'http_code': httpCode"), document.getText());

            await setSetting('json.snakeCase', false);
            await vscode.commands.executeCommand(command);
            assert.ok(document.getText().includes("'HTTPCode': httpCode"), document.getText());
        } finally {
            await setSetting('json.snakeCase', undefined);
        }
    });

    test('generates constructor, copyWith, serialization, equality and imports', async () => {
        const document = await openDart(classSource);
        await vscode.commands.executeCommand(command);
        const output = document.getText();

        assert.ok(output.includes('required this.name'), output);
        assert.ok(output.includes('required this.age'), output);
        assert.ok(output.includes('Person copyWith('), output);
        assert.ok(output.includes('Map<String, dynamic> toMap()'), output);
        assert.ok(output.includes('factory Person.fromMap('), output);
        assert.ok(output.includes('String toJson()'), output);
        assert.ok(output.includes('factory Person.fromJson('), output);
        assert.ok(output.includes('operator =='), output);
        assert.ok(output.includes('int get hashCode'), output);
        assert.strictEqual(occurrences(output, "import 'dart:convert';"), 1);
    });

    test('generated Dart class passes dart analyze', async () => {
        const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-dcg-analyze-'));
        try {
            const document = await openDart(classSource);
            await vscode.commands.executeCommand(command);
            fs.writeFileSync(path.join(fixtureDir, 'person.dart'), document.getText());
            analyzeDart(fixtureDir);
        } finally {
            fs.rmSync(fixtureDir, { recursive: true, force: true });
        }
    });

    test('does not duplicate generated members when run twice', async () => {
        const document = await openDart(classSource);
        await vscode.commands.executeCommand(command);
        const first = document.getText();
        await vscode.commands.executeCommand(command);
        const second = document.getText();

        for (const member of [
            'Person copyWith(',
            'Map<String, dynamic> toMap()',
            'factory Person.fromMap(',
            'String toJson()',
            'factory Person.fromJson('
        ]) {
            assert.strictEqual(occurrences(second, member), 1, member + '\n' + second);
        }
        assert.strictEqual(second, first, 'A second run should leave generated text unchanged');
    });

    test('respects disabled copyWith and JSON methods', async () => {
        const keys = ['copyWith.enabled', 'toJson.enabled', 'fromJson.enabled'];
        try {
            for (const key of keys) await setSetting(key, false);
            const document = await openDart(classSource);
            await vscode.commands.executeCommand(command);
            const output = document.getText();

            assert.ok(output.includes('Person({'), output);
            assert.ok(output.includes('Map<String, dynamic> toMap()'), output);
            assert.ok(!output.includes('Person copyWith('), output);
            assert.ok(!output.includes('String toJson()'), output);
            assert.ok(!output.includes('factory Person.fromJson('), output);
        } finally {
            for (const key of keys) await setSetting(key, undefined);
        }
    });

    test('respects constructor default values', async () => {
        try {
            await setSetting('constructor.default_values', true);
            const document = await openDart(classSource);
            await vscode.commands.executeCommand(command);
            const output = document.getText();

            assert.ok(output.includes("this.name = ''"), output);
            assert.ok(output.includes('this.age = 0'), output);
            assert.ok(!output.includes('required this.name'), output);
        } finally {
            await setSetting('constructor.default_values', undefined);
        }
    });

    test('rejects generation in non-Dart documents', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'plaintext',
            content: classSource
        });
        await vscode.window.showTextDocument(document);
        const result = await extension.generateDataClass();
        assert.strictEqual(result, null);
        assert.strictEqual(document.getText(), classSource);
    });

    test('reads primitive JSON types and reports malformed input', async () => {
        const reader = new extension.JsonReader(
            '{"name":"Ada","age":42,"rating":4.5,"active":true}',
            'person'
        );
        assert.strictEqual(await reader.error, null);
        assert.strictEqual(reader.files.length, 1);
        const content = reader.files[0].content;
        for (const field of [
            'final String name;',
            'final int age;',
            'final double rating;',
            'final bool active;'
        ]) {
            assert.ok(content.includes(field), content);
        }

        const malformed = new extension.JsonReader('{"name":', 'broken');
        assert.ok((await malformed.error).includes('malformed'));
        const primitiveArray = new extension.JsonReader('[1,2]', 'numbers');
        assert.ok((await primitiveArray.error).includes('not supported'));
    });

    test('JSON command generates a class from the active Dart document', async () => {
        const document = await openDart('{"name":"Ada","age":42}');
        const originalInputBox = vscode.window.showInputBox;
        vscode.window.showInputBox = async () => 'Person';
        try {
            assert.notStrictEqual(vscode.window.showInputBox, originalInputBox);
            await vscode.commands.executeCommand('dart_data_class.generate.from_json');
            const deadline = Date.now() + 5000;
            while (!document.getText().includes('class Person') && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            const output = document.getText();
            assert.ok(output.includes('class Person'), output);
            assert.ok(output.includes('final String name;'), output);
            assert.ok(output.includes('final int age;'), output);
        } finally {
            vscode.window.showInputBox = originalInputBox;
        }
    });

    test('generates nested JSON classes in the current document', async () => {
        const json = '{"id":1,"addressDetails":{"postalCode":"1100"}}';
        const document = await openDart(json);
        const reader = new extension.JsonReader(json, 'profile');
        assert.strictEqual(await reader.error, null);
        assert.strictEqual(reader.files.length, 2);

        await reader.commitJson({ report() {} }, false);
        const output = document.getText();
        assert.ok(output.includes('class Profile'), output);
        assert.ok(output.includes('class AddressDetails'), output);
        assert.ok(output.includes('final AddressDetails addressDetails;'), output);
        assert.ok(output.includes('final String postalCode;'), output);
        assert.ok(output.includes("'address_details':"), output);
        assert.ok(output.includes("map['address_details']"), output);
        assert.ok(output.includes("'postal_code':"), output);
        assert.ok(output.includes("map['postal_code']"), output);

        const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-dcg-nested-snake-'));
        try {
            fs.writeFileSync(path.join(fixtureDir, 'profile.dart'), output);
            analyzeDart(fixtureDir);
        } finally {
            fs.rmSync(fixtureDir, { recursive: true, force: true });
        }
    });

    test('writes nested JSON classes to separate files that dart analyze accepts', async () => {
        const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-dcg-fixture-'));
        try {
            const mainPath = path.join(fixtureDir, 'profile.dart');
            const addressPath = path.join(fixtureDir, 'address.dart');
            const json = '{"id":1,"address":{"city":"Maputo"}}';
            fs.writeFileSync(mainPath, json);
            const document = await vscode.workspace.openTextDocument(mainPath);
            await vscode.window.showTextDocument(document);
            assert.strictEqual(path.relative(fixtureDir, extension.getCurrentPath()), '');

            const reader = new extension.JsonReader(json, 'profile');
            assert.strictEqual(await reader.error, null);
            await reader.commitJson({ report() {} }, true);
            assert.ok(document.getText().includes("import 'address.dart';"), document.getText());
            assert.ok(document.getText().includes('class Profile'), document.getText());
            assert.ok(fs.existsSync(addressPath), 'Expected address.dart to be written');
            assert.ok(fs.readFileSync(addressPath, 'utf8').includes('class Address'));
            await document.save();

            analyzeDart(fixtureDir);
        } finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            fs.rmSync(fixtureDir, { recursive: true, force: true });
        }
    });

    test('offers generation quick fixes in a Dart file', async () => {
        const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-dcg-actions-'));
        try {
            const filePath = path.join(fixtureDir, 'person.dart');
            fs.writeFileSync(filePath, classSource);
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            const actions = await vscode.commands.executeCommand(
                'vscode.executeCodeActionProvider',
                document.uri,
                new vscode.Range(0, 0, 0, 5)
            );
            const titles = actions.map(action => action.title);
            assert.ok(titles.includes('Generate data class'), titles.join(', '));
            assert.ok(titles.includes('Generate constructor'), titles.join(', '));
            assert.ok(titles.includes('Generate copyWith'), titles.join(', '));
        } finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            fs.rmSync(fixtureDir, { recursive: true, force: true });
        }
    });
});
