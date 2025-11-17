#!/bin/bash
# Deployment Script for Make It Rain Enhanced v2.0.0

echo "🚀 Make It Rain Enhanced - Deployment Script"
echo "============================================="

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed or not in PATH"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run 'git init' first."
    exit 1
fi

echo "📋 Current git status:"
git status --short

echo ""
echo "🔍 Checking for changes..."
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ Working directory is clean"
else
    echo "📝 Found changes to commit:"
    git status --short
    
    echo ""
    read -p "🤔 Do you want to commit these changes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Staging all changes..."
        git add .
        
        echo "💬 Committing changes..."
        git commit -m "Enhanced Make It Rain v2.0.0 - Modern UI with React, MDX support, and responsive design

Features:
- React-powered dashboard with modern UI components
- Responsive design for desktop, tablet, and mobile
- Full-screen modal popups for immersive bookmark viewing
- Collection tree view with icons and hierarchical organization
- MDX support for rich content rendering
- Real-time search and filtering
- Smooth animations and transitions
- Touch-optimized mobile interface
- Advanced keyboard navigation
- Modern card/list/grid layouts

Technical:
- Added React 18, Framer Motion, Tailwind CSS utilities
- TypeScript improvements with better type safety
- Modular component architecture
- Custom React hooks for state management
- Enhanced error handling and loading states
- Mobile-first responsive breakpoints
- Performance optimizations with virtual scrolling"
        
        echo "✅ Changes committed successfully!"
    else
        echo "⏩ Skipping commit..."
    fi
fi

echo ""
echo "🏷️ Creating release tag v2.0.0..."
if git tag -a "v2.0.0" -m "Release v2.0.0 - Enhanced Modern UI

Major release featuring:
- Complete UI overhaul with React components  
- Mobile-responsive design
- MDX support for rich content
- Full-screen modal experience
- Advanced search and filtering
- Modern animations and interactions

Breaking Changes:
- Requires React dependencies
- New modern UI is opt-in via settings
- Updated minimum Obsidian version

Migration:
- Install new dependencies with npm install
- Enable 'Modern UI' in plugin settings
- Use 'Open Modern Raindrop Dashboard' command"; then
    echo "✅ Tag v2.0.0 created successfully!"
else
    echo "⚠️ Tag might already exist or creation failed"
fi

echo ""
echo "📤 Pushing to repository..."
read -p "🤔 Push to origin? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Pushing commits and tags..."
    git push origin main
    git push origin --tags
    echo "✅ Successfully pushed to repository!"
else
    echo "⏩ Skipping push. Run manually: git push origin main && git push origin --tags"
fi

echo ""
echo "🎉 Deployment process completed!"
echo ""
echo "📋 Next steps:"
echo "1. Create a GitHub release from the v2.0.0 tag"
echo "2. Upload the files from dist/ folder to the release"
echo "3. Add release notes from RELEASE_NOTES.md"
echo "4. Announce the enhanced version to users"
echo ""
echo "📁 Release files ready in dist/:"
ls -la dist/
