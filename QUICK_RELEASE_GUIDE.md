# Quick Release Guide - Make It Rain

## 🚀 One-Command Release

```bash
npm run release
```

That's it! This command:
1. ✅ Builds the plugin
2. ✅ Commits changes
3. ✅ Creates git tag
4. ✅ Pushes to GitHub
5. ✅ Shows release summary

---

## 📋 Before Release (5 minutes)

### 1. Update Version (3 files)

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

### 2. Update CHANGELOG.md

```markdown
## [2.3.0] - 2025-11-18

### Added
- Feature 1
- Feature 2

### Fixed
- Bug 1
```

### 3. Create Release Notes

Create `RELEASE_NOTES_v2.3.0.md` with user-facing information.

---

## 🎯 Release (1 minute)

```bash
npm run release
```

**Output**:
```
🚀 Starting release process for version 2.3.0...
📦 Building plugin...
✅ Build successful
💾 Committing...
✅ Committed
🏷️  Creating tag...
✅ Tag created
🌐 Pushing to GitHub...
✅ Pushed
✨ Release Complete! ✨
```

---

## ✅ After Release (5 minutes)

### 1. Go to GitHub Releases
```
https://github.com/frostmute/make-it-rain/releases
```

### 2. Edit Draft Release
- Click "Edit" on the draft

### 3. Add Release Notes
- Copy from `RELEASE_NOTES_v2.3.0.md`

### 4. Upload Files
- main.js
- manifest.json
- styles.css
- styles_modern.css

### 5. Publish
- Click "Publish release"

---

## 📊 Total Time: ~10 minutes

| Step | Time | Command |
|------|------|---------|
| Update version | 2 min | Edit 3 files |
| Update changelog | 2 min | Edit CHANGELOG.md |
| Create release notes | 3 min | Create RELEASE_NOTES_vX.X.X.md |
| Run release | 1 min | `npm run release` |
| Finalize on GitHub | 2 min | Edit + Publish |

---

## 🔄 Release Checklist

- [ ] Version updated (3 files)
- [ ] CHANGELOG.md updated
- [ ] RELEASE_NOTES created
- [ ] All features working
- [ ] Mobile responsive
- [ ] No console errors
- [ ] `npm run release` executed
- [ ] GitHub release published

---

## 🐛 Troubleshooting

### Release fails?
```bash
git status
npm run build
```

### Tag already exists?
```bash
git tag -d v2.3.0
git push origin :refs/tags/v2.3.0
npm run release
```

### Need to push again?
```bash
git push origin main
git push origin --tags
```

---

## 📚 Full Guides

- **RELEASE_GUIDE.md** - Complete release guide
- **NPM_SCRIPTS_GUIDE.md** - All scripts
- **RELEASE_AUTOMATION_SUMMARY.md** - Automation details

---

## 🎯 Key Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Build plugin |
| `npm run dev` | Development |
| `npm run release` | **Complete release** |
| `npm run lint:md` | Lint markdown |
| `npm run build-and-copy` | Build + copy to vault |

---

## 🌐 BRAT Installation

After release, users can install:
```
https://github.com/frostmute/make-it-rain
```

---

**That's all! Happy releasing! 🚀**
