# Make It Rain - Release Guide

## Quick Release Process

### One-Command Release

```bash
npm run release
```

This single command will:
1. ✅ Build the plugin
2. ✅ Stage all changes
3. ✅ Commit with version tag
4. ✅ Create git tag
5. ✅ Push to GitHub (main branch + tags)
6. ✅ Display release summary

## What the Release Script Does

### Step 1: Build
```bash
npm run build
```
- Compiles TypeScript
- Bundles with esbuild
- Outputs to `dist/` folder

### Step 2: Stage Changes
```bash
git add -A
```
- Stages all modified files
- Includes dist/, manifest.json, versions.json, etc.

### Step 3: Commit
```bash
git commit -m "Release v2.2.0"
```
- Creates commit with version in message
- Automatically extracts version from package.json

### Step 4: Create Tag
```bash
git tag -a v2.2.0 -m "Release v2.2.0"
```
- Creates annotated git tag
- Matches version in package.json

### Step 5: Push to GitHub
```bash
git push origin main
git push origin --tags
```
- Pushes commits to main branch
- Pushes tags to GitHub

## Release Output

When you run `npm run release`, you'll see:

```
🚀 Starting release process for version 2.2.0...

📦 Building plugin...
✅ Build successful

🔍 Checking git status...
📝 Staging changes...
✅ Changes staged

💾 Committing with message: "Release v2.2.0"
✅ Committed

🏷️  Creating tag: v2.2.0
✅ Tag created

🌐 Pushing to GitHub...
✅ Pushed to main branch

🏷️  Pushing tags...
✅ Tags pushed

==================================================
✨ Release Complete! ✨
==================================================

📌 Version: 2.2.0
🏷️  Tag: v2.2.0
📂 Build output: dist/

📦 Release files:
  - dist/main.js
  - dist/manifest.json
  - dist/styles.css
  - dist/styles_modern.css

🔗 GitHub: https://github.com/frostmute/make-it-rain/releases/tag/v2.2.0

💡 Next steps:
  1. Go to GitHub releases page
  2. Edit the v2.2.0 release
  3. Add release notes from RELEASE_NOTES_v2.2.0.md
  4. Upload dist files as release assets

✅ Ready for BRAT import!
```

## Manual Release Steps (if needed)

If you prefer to do it manually:

### 1. Build
```bash
npm run build
```

### 2. Commit Changes
```bash
git add -A
git commit -m "Release v2.2.0"
```

### 3. Create Tag
```bash
git tag -a v2.2.0 -m "Release v2.2.0"
```

### 4. Push to GitHub
```bash
git push origin main
git push origin --tags
```

### 5. Create GitHub Release
1. Go to: https://github.com/frostmute/make-it-rain/releases
2. Click "Draft a new release"
3. Select tag: `v2.2.0`
4. Title: `Release v2.2.0`
5. Description: Copy from `RELEASE_NOTES_v2.2.0.md`
6. Upload files from `dist/` folder:
   - main.js
   - manifest.json
   - styles.css
   - styles_modern.css
7. Click "Publish release"

## Version Bumping

To bump version before release:

### Update Version in package.json
```json
{
  "version": "2.3.0"
}
```

### Update manifest.json
```json
{
  "version": "2.3.0"
}
```

### Update versions.json
```json
{
  "2.3.0": "1.8.10"
}
```

Then run:
```bash
npm run release
```

## Release Files

The release includes:

| File | Purpose | Size |
|------|---------|------|
| `main.js` | Compiled plugin code | ~730 KB |
| `manifest.json` | Plugin metadata | ~380 B |
| `styles.css` | Main styles | ~26 KB |
| `styles_modern.css` | Modern styles | ~16 KB |

## BRAT Installation

After release, users can install via BRAT:

1. Install BRAT plugin in Obsidian
2. Go to BRAT settings
3. Click "Add Beta Plugin"
4. Enter: `https://github.com/frostmute/make-it-rain`
5. Click "Add Plugin"
6. Enable in Community Plugins

## GitHub Actions (Optional)

To automate releases, create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/main.js
            dist/manifest.json
            dist/styles.css
            dist/styles_modern.css
```

## Troubleshooting

### Tag Already Exists
```
Error: tag v2.2.0 already exists
```
**Solution**: Delete the tag and try again
```bash
git tag -d v2.2.0
git push origin :refs/tags/v2.2.0
npm run release
```

### Build Fails
```
Error: Build failed
```
**Solution**: Check for TypeScript errors
```bash
npm run build
```

### Push Fails
```
Error: failed to push some refs
```
**Solution**: Pull latest changes first
```bash
git pull origin main
npm run release
```

### No Changes to Commit
```
No changes to commit
```
**Solution**: This is normal if nothing changed. The script will skip the commit step and just push the tag.

## Release Checklist

Before releasing:

- [ ] All tests pass
- [ ] Build completes without errors
- [ ] No TypeScript warnings
- [ ] Version updated in package.json
- [ ] Version updated in manifest.json
- [ ] Version added to versions.json
- [ ] CHANGELOG.md updated
- [ ] RELEASE_NOTES_vX.X.X.md created
- [ ] All features working
- [ ] Mobile responsive
- [ ] No console errors

## Release Schedule

Recommended release schedule:

- **Patch (v2.2.1)**: Bug fixes, small improvements
- **Minor (v2.3.0)**: New features, enhancements
- **Major (v3.0.0)**: Breaking changes, major redesign

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/frostmute/make-it-rain/issues
- **GitHub Discussions**: https://github.com/frostmute/make-it-rain/discussions

---

**Happy releasing! 🚀**
