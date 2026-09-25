# Releasing this fork

The release workflow is `.github/workflows/publish.yaml`. A push to `master` always runs the dependency audit and VS Code integration tests. It packages and publishes only when the version in `package.json` differs from the previous commit; `--skip-duplicate` also guards against an already-published version. Do not push a version bump until the one-time Marketplace setup is complete.

## One-time owner setup

1. Make `https://github.com/ultramarcante-inc/Dart-Data-Class-Generator-fork` public so the README's linked demonstration GIFs and source attribution work.
2. Create or confirm the Visual Studio Marketplace publisher with ID `ultramarcante`. Confirm that the account used for setup can publish under it.
3. Configure a trusted-publishing policy for GitHub repository `ultramarcante-inc/Dart-Data-Class-Generator-fork` and workflow `.github/workflows/publish.yaml` in the publisher's Marketplace settings. The workflow already grants `id-token: write` and uses `vsce publish --oidc`; no PAT secret is needed.
4. Confirm the publisher ID and extension name are available and that the Marketplace accepts the first fork version `0.6.0`. If the Marketplace requires an initial manual upload before creating the trust policy, first upload the validated VSIX through the publisher portal, then configure OIDC and start automated publishing with a later version bump. Do not remove the version gate to force a duplicate publication.

See the official [VSCE trusted-publishing guide](https://github.com/microsoft/vscode-vsce#trusted-publishing) and [VS Code publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Each release

1. Review changes and update `CHANGELOG.md`, including credit to the original project where relevant.
2. Bump the version in `package.json` and `package-lock.json` together. On Windows, `npm.cmd install --package-lock-only --ignore-scripts` updates the lockfile.
3. Run `npm.cmd ci`, `npm.cmd audit --audit-level=high`, and `npm.cmd test` with VS Code and Dart installed. On Windows, set `VSCODE_EXECUTABLE_PATH` to your `Code.exe` path if the test runner cannot find it.
4. Build and inspect a local VSIX with `npx.cmd --yes @vscode/vsce package`. Install it in a separate VS Code profile or use **Extensions: Install from VSIX...** and verify both generation commands.
5. Commit and push to `master` only after reviewing the diff and confirming the Marketplace setup. Watch the **Test and publish extension** GitHub Actions run and verify the resulting Marketplace listing. A push without a version bump runs checks but skips publication.

The command IDs and `dart_data_class_generator.*` settings intentionally remain unchanged for compatibility. The visible extension name, publisher and extension ID are new; users of the old listing do not automatically migrate to this fork.