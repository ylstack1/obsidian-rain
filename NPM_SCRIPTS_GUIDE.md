# Make It Rain - NPM Scripts Guide

## Available Scripts

### Development

#### `npm run dev`
**Purpose**: Start development server with hot reload
```bash
npm run dev
```
- Watches for file changes
- Rebuilds automatically
- Great for development

#### `npm run build`
**Purpose**: Build plugin for production
```bash
npm run build
```
- Compiles TypeScript
- Bundles with esbuild
- Outputs to `dist/` folder
- Minified and optimized

### Linting & Formatting

#### `npm run lint:md`
**Purpose**: Lint and fix Markdown files
```bash
npm run lint:md
```
- Checks Markdown syntax
- Auto-fixes formatting
- Ensures consistency

### Vault Integration

#### `npm run copy-to-vault`
**Purpose**: Copy built plugin to Obsidian vault
```bash
npm run copy-to-vault
```
- Copies `dist/` files to vault
- Requires `VAULT_PATH` in `.env`
- Useful for testing

#### `npm run build-and-copy`
**Purpose**: Build and copy to vault in one command
```bash
npm run build-and-copy
```
- Runs `npm run build`
- Then `npm run copy-to-vault`
- Perfect for development workflow

### Release & Deployment

#### `npm run release` ⭐ **MAIN RELEASE COMMAND**
**Purpose**: Complete release process
```bash
npm run release
```

**What it does**:
1. ✅ Builds plugin (`npm run build`)
2. ✅ Stages all changes (`git add -A`)
3. ✅ Commits with version tag (`git commit -m "Release v2.2.0"`)
4. ✅ Creates git tag (`git tag -a v2.2.0`)
5. ✅ Pushes to GitHub (`git push origin main`)
6. ✅ Pushes tags (`git push origin --tags`)
7. ✅ Displays release summary

**Output**:
```
🚀 Starting release process for version 2.2.0...
📦 Building plugin...
✅ Build successful
🔍 Checking git status...
📝 Staging changes...
💾 Committing...
🏷️  Creating tag...
🌐 Pushing to GitHub...
✨ Release Complete! ✨
```

**Usage**:
```bash
# Before release, update version in:
# - package.json
# - manifest.json
# - versions.json

npm run release
```

## Release Workflow

### Step 1: Update Version

Update version in three files:

**package.json**:
```json
{
  "version": "2.3.0"
}
```

**manifest.json**:
```json
{
  "version": "2.3.0"
}
```

**versions.json**:
```json
{
  "2.3.0": "1.8.10"
}
```

### Step 2: Update Changelog

Edit `CHANGELOG.md`:
```markdown
## [2.3.0] - 2025-11-18

### Added
- New feature 1
- New feature 2

### Fixed
- Bug fix 1
```

### Step 3: Create Release Notes

Create `RELEASE_NOTES_v2.3.0.md` with user-facing information.

### Step 4: Run Release

```bash
npm run release
```

### Step 5: Finalize on GitHub

1. Go to: https://github.com/frostmute/make-it-rain/releases
2. Edit the draft release
3. Add release notes
4. Upload dist files
5. Publish

## Script Dependencies

```
npm run release
  ├── npm run build
  │   ├── tsc (TypeScript compiler)
  │   └── esbuild (bundler)
  ├── git add -A
  ├── git commit
  ├── git tag
  └── git push
```

## Common Workflows

### Development Workflow

```bash
# 1. Start development
npm run dev

# 2. Make changes

# 3. Test in vault
npm run build-and-copy

# 4. Repeat steps 2-3
```

### Release Workflow

```bash
# 1. Update version files
# (package.json, manifest.json, versions.json)

# 2. Update changelog
# (CHANGELOG.md)

# 3. Create release notes
# (RELEASE_NOTES_vX.X.X.md)

# 4. Run release
npm run release

# 5. Finalize on GitHub
# (Add notes, upload files, publish)
```

### Quick Release

```bash
# All-in-one command
npm run release
```

## Environment Variables

### Optional: .env file

Create `.env` in project root:

```env
# Vault path for copy-to-vault script
VAULT_PATH=/path/to/obsidian/vault/.obsidian/plugins/make-it-rain

# GitHub token for automated releases (optional)
GITHUB_TOKEN=your_token_here
```

## Troubleshooting

### Build Fails
```bash
# Check for errors
npm run build

# Clear cache
rm -rf dist/
npm run build
```

### Release Fails
```bash
# Check git status
git status

# Check git config
git config --list

# Try manual release
git add -A
git commit -m "Release v2.3.0"
git tag -a v2.3.0 -m "Release v2.3.0"
git push origin main
git push origin --tags
```

### Copy to Vault Fails
```bash
# Check VAULT_PATH
echo $VAULT_PATH

# Create .env file with correct path
echo "VAULT_PATH=/path/to/vault" > .env
```

## Script Reference

| Script | Command | Purpose |
|--------|---------|---------|
| dev | `npm run dev` | Development with hot reload |
| build | `npm run build` | Production build |
| lint:md | `npm run lint:md` | Lint Markdown files |
| copy-to-vault | `npm run copy-to-vault` | Copy to Obsidian vault |
| build-and-copy | `npm run build-and-copy` | Build and copy |
| release | `npm run release` | Complete release process |
| version | `npm run version` | Version bump (internal) |

## Best Practices

1. **Always build before release**
   ```bash
   npm run build
   ```

2. **Test in vault before release**
   ```bash
   npm run build-and-copy
   ```

3. **Update version in all files**
   - package.json
   - manifest.json
   - versions.json

4. **Update changelog**
   - Add entry to CHANGELOG.md
   - Follow Keep a Changelog format

5. **Create release notes**
   - User-facing information
   - Feature highlights
   - Installation instructions

6. **Use semantic versioning**
   - MAJOR.MINOR.PATCH
   - v2.2.0 format

7. **Test release**
   ```bash
   npm run release
   ```

## GitHub Integration

### Automatic Releases

The release script automatically:
- ✅ Creates git commits
- ✅ Creates git tags
- ✅ Pushes to GitHub
- ✅ Displays release info

### Manual GitHub Release

After running `npm run release`:

1. Go to GitHub releases page
2. Edit the draft release
3. Add release notes from RELEASE_NOTES_vX.X.X.md
4. Upload dist files:
   - main.js
   - manifest.json
   - styles.css
   - styles_modern.css
5. Click "Publish release"

## BRAT Installation

After release, users can install via BRAT:

```
https://github.com/frostmute/make-it-rain
```

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/frostmute/make-it-rain/issues
- **GitHub Discussions**: https://github.com/frostmute/make-it-rain/discussions

---

**Happy scripting! 🚀**
