# Dart Data Class Generator Fork

A community fork of [Dart Data Class Generator](https://github.com/bxqm/Dart-Data-Class-Generator). Generate Dart data classes from class properties or JSON, including constructors, `copyWith`, Map/JSON serialization, equality, and `toString`.

This is an independent fork, not an official release by the original authors. It builds on the work of [bxqm](https://github.com/bxqm/Dart-Data-Class-Generator) and the [huang12zheng fork](https://github.com/huang12zheng/Dart-Data-Class-Generator). See [Credits and license](#credits-and-license) below.

## What's different in this fork

- JSON and Map keys use `snake_case` by default; Dart fields remain `camelCase`.
- JSON input preserves its original key spelling for serialization when snake_case conversion is disabled. The generator detects names that would collide after conversion instead of silently producing duplicate fields.
- Dependency security fixes and expanded integration tests.
- Existing command IDs and `dart_data_class_generator.*` settings remain compatible with the previous extension.

## Generate from class properties

![Generate from class properties](https://raw.githubusercontent.com/ultramarcante-inc/Dart-Data-Class-Generator-fork/master/assets/gif_from_class.gif)

1. Open a Dart file with a class containing fields.
2. Open the Command Palette with `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS).
3. Run **Dart Data Class Generator Fork: Generate from class properties**. If the file contains multiple classes, select the classes to generate.

You can also put the cursor on a class, constructor, or field and use the **Quick Fix** menu (`Ctrl+.` / `Cmd+.`) to generate a whole class or selected methods.

Running generation again updates generated methods. Review the diff first: custom changes to generated methods may be overwritten.

For enums, annotate the field with a comment:

```dart
// enum
final Status status;
```

Equatable and EquatableMixin generation can be enabled through the settings below.

## Generate from JSON

![Generate from JSON](https://raw.githubusercontent.com/ultramarcante-inc/Dart-Data-Class-Generator-fork/master/assets/gif_from_json.gif)

1. Paste raw JSON into an otherwise empty `.dart` file.
2. Open the Command Palette and run **Dart Data Class Generator Fork: Generate from JSON**.
3. Enter the top-level class name. For nested objects, choose whether to use separate files or the current file.

JSON import is still a beta feature. In particular, a numeric sample such as `1` may be inferred as `int` even if later payloads contain fractional values.

## Snake-case serialization

The setting `dart_data_class_generator.json.snakeCase` defaults to `true`. For example, the Dart field `firstName` is serialized with the Map/JSON key `first_name`; generated `toMap` and `fromMap` use the same key. Set it to `false` to keep the original input key spelling instead. The `toJson` and `fromJson` methods delegate to the Map methods.

```json
{
  "dart_data_class_generator.json.snakeCase": false
}
```

Changing this setting changes the wire format of regenerated classes. Check compatibility with existing API payloads before switching it in an established project. If two input keys normalize to the same Dart field or serialization key, generation reports a collision.

## Additional features

The extension also offers a quick fix to sort and format Dart imports.

![Import refactoring](https://raw.githubusercontent.com/ultramarcante-inc/Dart-Data-Class-Generator-fork/master/assets/import_demo.gif)

## Settings

All settings retain the `dart_data_class_generator` prefix for compatibility.

| Setting suffix | Default | Purpose |
| --- | --- | --- |
| `json.snakeCase` | `true` | Convert JSON/Map keys to snake_case. |
| `json.seperate` | `ask` | Place nested classes in separate files or the current file. The legacy spelling is retained for compatibility. |
| `quick_fixes` | `true` | Enable quick fixes. |
| `fromMap.default_values` | `false` | Provide defaults when deserializing null values. |
| `constructor.default_values` | `false` | Generate constructor defaults. |
| `constructor.required` | `false` | Add `@required` to constructor parameters; incompatible with constructor defaults. |
| `override.manual` | `false` | Confirm each generated method replacement. |
| `ignoreComment.enabled` | empty | Add a file-level analyzer comment. |
| `constructor.enabled`, `copyWith.enabled`, `toMap.enabled`, `fromMap.enabled`, `toJson.enabled`, `fromJson.enabled`, `toString.enabled`, `equality.enabled`, `hashCode.enabled` | `true` | Enable individual generated members. |
| `hashCode.use_jenkins` | `false` | Use the Jenkins hash implementation. |
| `useEquatable`, `useEquatableMixin` | `false` | Use Equatable for equality and hash codes. The mixin option requires `useEquatable`. |

## Test locally

Run `npm ci`, then `npm test` with VS Code and Dart installed. In VS Code, open this repository and press `Ctrl+F5` to launch an Extension Development Host without attaching the debugger. You can run either command there before publishing. For a packaged check, build a VSIX with `npx @vscode/vsce package` and install it in a separate VS Code profile using **Extensions: Install from VSIX...**.

## Credits and license

The original [Dart Data Class Generator](https://github.com/bxqm/Dart-Data-Class-Generator) was created by **bxqm**. This repository also follows the [huang12zheng fork](https://github.com/huang12zheng/Dart-Data-Class-Generator). The fork's new work is maintained by Ultramarcante contributors. The original MIT copyright notice remains in [LICENSE.md](LICENSE.md), and the earlier release history remains in [CHANGELOG.md](CHANGELOG.md).

Issues and contributions for this fork: [ultramarcante-inc/Dart-Data-Class-Generator-fork](https://github.com/ultramarcante-inc/Dart-Data-Class-Generator-fork).