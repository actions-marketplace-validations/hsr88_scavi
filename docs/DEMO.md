# Scavi demo and recording guide

This walkthrough creates a disposable copy of a deliberately outdated repository. It demonstrates deterministic checks only, so it needs no API key and does not send repository content anywhere.

## Prepare the recording

From the root of the Scavi repository in PowerShell:

```powershell
Copy-Item -Recurse examples/demo-repo .scavi-demo
Set-Location .scavi-demo
```

For a clean recording, use a terminal around 100-120 characters wide, increase the font size, and hide unrelated windows or notifications.

## Suggested recording

### 1. Show the stale context

```powershell
Get-Content AGENTS.md
Get-Content CLAUDE.md
```

The files intentionally claim that the repository uses an old directory, npm/yarn, an absent script, and React 18.

### 2. Run the public npm package

```powershell
npx scavi-cli check
```

Scavi should report:

- a missing `apps/frontend` path;
- an invalid `test:e2e` script;
- package-manager mismatches;
- a React major-version mismatch;
- a cross-file package-manager conflict.

### 3. Preview and apply safe fixes

```powershell
npx scavi-cli fix
```

Press `y` when prompted. Scavi changes only deterministic, evidence-backed values such as the package manager and React major version. The missing path and absent script remain for a human to resolve.

### 4. Show machine-readable output

```powershell
npx scavi-cli check --format json
```

This is useful as a final shot for CI and tooling integrations.

## Suggested screenshots

Capture these at a readable resolution:

1. `npx scavi-cli check` with several findings and evidence visible.
2. The `scavi fix` preview before confirmation.
3. The final JSON summary.
4. The GitHub Action job summary from a pull request.

Recommended repository filenames:

```text
docs/assets/scavi-check.png
docs/assets/scavi-fix.png
docs/assets/scavi-json.png
docs/assets/scavi-demo.gif
```

Once the files exist, they can be embedded in the main README under the Demo section.

## Reset or clean up

Return to the Scavi repository root and remove only the disposable demo copy:

```powershell
Set-Location ..
Remove-Item -Recurse -Force .scavi-demo
```

To record another take, copy `examples/demo-repo` again.
