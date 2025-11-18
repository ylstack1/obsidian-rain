# Make It Rain v2.1.0 - Installation Guide

## 📦 Installation Methods

### Method 1: BRAT (Recommended for Easy Updates)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in Obsidian
2. Open BRAT settings
3. Click "Add Beta Plugin"
4. Enter: `https://github.com/frostmute/make-it-rain`
5. Click "Add Plugin"
6. Go to Settings → Community Plugins → Make It Rain
7. Click "Enable"

**Advantages**:
- ✅ One-click updates
- ✅ Automatic version checking
- ✅ Easy rollback if needed

### Method 2: Manual Installation

1. Download these files from the `dist/` folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`

2. Create plugin folder:
   ```
   .obsidian/plugins/make-it-rain/
   ```

3. Copy downloaded files into the folder

4. Restart Obsidian

5. Go to Settings → Community Plugins → Make It Rain → Enable

**Advantages**:
- ✅ No external dependencies
- ✅ Works offline
- ✅ Full control over updates

### Method 3: From Source (For Developers)

1. Clone the repository:
   ```bash
   git clone https://github.com/frostmute/make-it-rain.git
   cd make-it-rain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Copy to your vault:
   ```bash
   npm run copy-to-vault
   ```

5. Restart Obsidian and enable the plugin

## ⚙️ Initial Setup

### 1. Configure API Token

1. Go to [Raindrop.io Settings](https://app.raindrop.io/settings/integrations)
2. Click "+ Create new app"
3. Give it a name (e.g., "Obsidian Make It Rain")
4. Click the app, then "Create test token"
5. Copy the token

In Obsidian:
1. Settings → Community Plugins → Make It Rain → Options
2. Paste your token in "Raindrop.io API Token"
3. Click "Verify Token" to test

### 2. Set Default Vault Location (Optional)

1. Settings → Community Plugins → Make It Rain → Options
2. Enter default folder path (e.g., `Imports/Raindrops`)
3. Leave blank to save in vault root

### 3. Customize Filename Template (Optional)

1. Settings → Community Plugins → Make It Rain → Options
2. Modify "File Name Template" (default: `{{title}}`)
3. Available variables:
   - `{{title}}` - Bookmark title
   - `{{id}}` - Raindrop ID
   - `{{collectionTitle}}` - Collection name
   - `{{date}}` - Creation date (YYYY-MM-DD)

## 🚀 Quick Start

### Open Dashboard

1. Command Palette: `Ctrl+P` (or `Cmd+P` on Mac)
2. Search: "Open Raindrop Dashboard"
3. Press Enter

### Search Bookmarks

1. In dashboard, use the search bar at the top
2. Type to filter by title, excerpt, or tags
3. Results update in real-time

### Add New Bookmark

1. Click "Add New" button in dashboard
2. Or use Command Palette: "Add New Bookmark from URL"
3. Enter bookmark details
4. Click "Create"

### View Bookmark Details

1. Click on any bookmark in the list
2. Details appear in the right panel
3. View tags, notes, highlights, and cover image

## 📱 Mobile Usage

The plugin is fully responsive on mobile devices:

- **Portrait Mode**: Collections panel at top (35% height), items below
- **Landscape Mode**: Collections on left, items on right
- **Touch Friendly**: Large tap targets and proper spacing
- **Optimized**: Search and navigation work smoothly

## 🔧 Troubleshooting

### "API token is not set" Error

**Solution**: 
1. Go to Settings → Community Plugins → Make It Rain
2. Paste your Raindrop.io API token
3. Click "Verify Token"

### Collections Not Loading

**Solution**:
1. Check your internet connection
2. Verify API token is correct
3. Check Raindrop.io API status
4. Open Developer Console (`Ctrl+Shift+I`) for error details

### Search Not Working

**Solution**:
1. Make sure a collection is selected
2. Try refreshing the dashboard
3. Check browser console for errors

### Mobile Layout Issues

**Solution**:
1. Restart Obsidian
2. Clear browser cache
3. Check if you're using latest version
4. Report issue on GitHub

## 📚 Documentation

- **Full Documentation**: [GitHub Pages](https://frostmute.github.io/make-it-rain/)
- **GitHub Repository**: [frostmute/make-it-rain](https://github.com/frostmute/make-it-rain)
- **Issues & Features**: [GitHub Issues](https://github.com/frostmute/make-it-rain/issues)

## 💡 Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+P` - Open Command Palette
- `Ctrl+Shift+I` - Open Developer Console (for debugging)

### Best Practices

1. **Organize Collections**: Use Raindrop.io collections to organize bookmarks
2. **Use Tags**: Tag bookmarks for easier searching
3. **Regular Syncs**: Periodically fetch new bookmarks
4. **Backup**: Regularly backup your Obsidian vault

### Advanced Usage

- **Template Customization**: Edit templates in Settings for custom note format
- **Batch Import**: Use "Fetch Raindrops" to import multiple bookmarks at once
- **Quick Import**: Use "Quick Import" for single bookmarks by URL/ID

## 🐛 Report Issues

Found a bug? Have a feature request?

1. Check [existing issues](https://github.com/frostmute/make-it-rain/issues)
2. Create a [new issue](https://github.com/frostmute/make-it-rain/issues/new)
3. Include:
   - Obsidian version
   - Plugin version
   - Steps to reproduce
   - Error messages (from console)

## 🙏 Support

If you find this plugin helpful:

- ⭐ Star the [GitHub repository](https://github.com/frostmute/make-it-rain)
- 💬 Share feedback and suggestions
- ☕ [Buy me a coffee](https://ko-fi.com/frostmute)

## 📝 Version Info

- **Current Version**: 2.1.0
- **Release Date**: November 18, 2025
- **Minimum Obsidian**: 0.15.0
- **Status**: Stable

---

**Happy bookmarking! 🌧️**
