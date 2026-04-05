# Release Automation

## Overview

The repository now uses a two-step release flow for the Electron desktop app:

1. `.github/workflows/build-artifacts.yml`
   - Runs automatically on every push to `main`.
   - Verifies the workspace with Bun, Turbo, Vitest, and OXC.
   - Builds desktop artifacts on Windows, macOS, and Linux.
   - Uploads each platform build as a GitHub Actions artifact.

2. `.github/workflows/release.yml`
   - Runs manually with `workflow_dispatch`.
   - Downloads artifacts from a selected `build-artifacts` run.
   - Creates a GitHub Release and attaches those artifacts.

## Operator Flow

### Continuous artifacts on `main`

Every push to `main` produces artifacts named like:

- `desktop-windows-<sha>`
- `desktop-macos-<sha>`
- `desktop-linux-<sha>`

Each workflow job summary also records:

- the platform
- the artifact name
- the workflow run ID
- the commit SHA

The packaged files are collected from `apps/desktop/artifacts` before being uploaded to GitHub Actions.

### Promote a build into a Release

To publish one of those builds:

1. Open the successful `build-artifacts` workflow run in GitHub Actions.
2. Copy its run ID.
3. Run the `release` workflow manually.
4. Provide:
   - `run_id`: the build run to promote
   - `tag_name`: the Git tag to create, such as `v0.1.0`
   - `release_name`: the display title for the release
   - `draft`: whether the release should start as a draft
   - `prerelease`: whether the release should be marked as a prerelease

The workflow will create the release against the exact commit used by the selected build run.

## Secrets

This flow is intentionally designed to avoid storing a personal access token in the repository.

- Use the built-in GitHub Actions `GITHUB_TOKEN` for artifact download and release creation.
- Do not create a token file in the workspace.
- Do not rely on `.gitignore` for GitHub secrets.
- Store any future signing or notarization credentials only in GitHub repository or organization secrets.

If a personal access token was previously pasted or exposed during setup, revoke it and create a new one only if a later use case truly requires it.

## Future Optional Enhancements

The current flow is enough for continuous artifacts and manual GitHub Releases. The following can be added later without redesigning the pipeline:

- Windows code signing
- macOS notarization and signing
- Linux package signing
- semantic version/tag automation
- changelog generation from commits or PRs
