# Make It Rain v2.1.0 - Release Notes

**Release Date**: November 18, 2025

## 🎉 Major Updates

### 📱 **Responsive Mobile UI Overhaul**
- **Fixed bottom-half split view on mobile**: Collections panel now properly constrained to 35vh with flexible item panel
- **Improved mobile layout**: Collections and items panels stack vertically on mobile with proper scrolling
- **Better touch interactions**: Optimized spacing and sizing for mobile devices
- **Cross-platform compatibility**: Seamless experience on phones, tablets, and desktops

### 🔍 **Search Functionality**
- **Real-time search**: Search bookmarks by title, excerpt, or tags
- **Instant filtering**: Results update as you type
- **Smart matching**: Searches across multiple fields for comprehensive results
- **Mobile-friendly**: Search bar optimized for all screen sizes

### ✏️ **Enhanced Tag Management**
- **Improved tag visibility**: Tags now display prominently in item detail view
- **Better tag styling**: Enhanced visual design with hover effects
- **Tag edit button**: Prepare for future tag assignment features
- **No tags indicator**: Clear messaging when items have no tags

### 🎨 **UI/UX Improvements**
- **Add New button**: Fully functional - opens bookmark creation modal
- **Better visual hierarchy**: Improved spacing and typography
- **Responsive design**: All components adapt to screen size
- **Accessibility**: Enhanced focus states and keyboard navigation

### 🔧 **Technical Improvements**
- **CSS optimization**: Added standard `line-clamp` property for better compatibility
- **Mobile breakpoints**: Proper media queries for 768px and below
- **Flexible layouts**: Using flexbox for better responsiveness
- **Better event handling**: Improved search input event listeners

## 📋 What's Fixed

- ✅ Mobile UI broken - bottom half split view now responsive
- ✅ Add button not working - now executes add-new-bookmark command
- ✅ Search bar not functional - full search implementation
- ✅ Tags list not visible - enhanced visibility with edit options
- ✅ Mobile layout issues - proper flex constraints and scrolling

## 🚀 What's Coming Next

- **Modal tag assignment** with multiple selection support
- **New tab system** for item details (open in separate tabs instead of inline)
- **Popup card pages** for data view with screen-fit design
- **Dashboard subtask display** component
- **Advanced filtering** options
- **Keyboard shortcuts** for power users

## 📦 Installation

### For BRAT (Obsidian Plugin Manager)
Add this to your BRAT custom plugins:
```
https://github.com/frostmute/make-it-rain
```

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [releases page](https://github.com/frostmute/make-it-rain/releases)
2. Create folder: `.obsidian/plugins/make-it-rain/`
3. Copy files into the folder
4. Restart Obsidian
5. Enable plugin in Settings → Community Plugins

## 🐛 Known Issues

- Tag editing modal coming in next release
- Subtask display not yet implemented
- New tab system for item details in development

## 💡 Tips & Tricks

- Use the search bar to quickly find bookmarks across all collections
- Click on a collection to view its items
- Hover over tags to see the full tag name
- Use the Add New button to create bookmarks directly from the dashboard

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/frostmute/make-it-rain/issues)
- **Discussions**: [GitHub Discussions](https://github.com/frostmute/make-it-rain/discussions)
- **Documentation**: [GitHub Pages](https://frostmute.github.io/make-it-rain/)

## 🙏 Credits

Developed with ❤️ by [frostmute](https://github.com/frostmute)

If you find this plugin helpful, consider [supporting its development](https://ko-fi.com/frostmute)

---

**Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed version history
