# Release Automation

## Overview

The repository now uses a two-step release flow for the Electron desktop app:

1. `.github/workflows/build-artifacts.yml`
   - Runs automatically on every push to `release/*` branches.
   - Verifies the workspace with Bun, Turbo, Vitest, and OXC.
   - Builds desktop release outputs on Windows, macOS, and Linux.
   - Uploads the primary distributable for each platform as a GitHub Actions artifact.

2. `.github/workflows/release.yml`
   - Runs manually with `workflow_dispatch`.
   - Resolves the latest successful `build-artifacts` run for a chosen `release/*` branch.
   - Derives the release tag from the branch name by stripping the `release/` prefix.
   - Downloads the workflow artifact archives, extracts the distributable file for each platform, and attaches those files to the GitHub Release.

## Operator Flow

### Continuous artifacts on `release/*`

Every push to a `release/*` branch produces artifacts named like:

- `desktop-windows-<sha>`
- `desktop-macos-<sha>`
- `desktop-linux-<sha>`

Each workflow job summary also records:

- the platform
- the distributable filename
- the workflow artifact name
- the release branch
- the derived tag
- the workflow run ID
- the commit SHA

The uploaded files come from `apps/desktop/artifacts` and are limited to:

- Windows: portable `.exe`
- macOS: `.zip`
- Linux: `.AppImage`

### Promote a build into a Release

To publish one of those builds:

1. Push commits to a branch named like `release/v0.1.0`.
2. Wait for the `build-artifacts` workflow to complete successfully on that branch.
3. Run the `release` workflow manually.
4. Provide:
   - `release_branch`: the branch to promote, such as `release/v0.1.0`
   - `release_name`: optional display title for the release. If omitted, the derived tag is used.
   - `draft`: whether the release should start as a draft
   - `prerelease`: whether the release should be marked as a prerelease

The workflow will promote the latest successful `build-artifacts` run for that branch and create the release against the exact commit used by that run.

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
