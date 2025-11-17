# Enhanced Installation and Setup Script
# This script helps set up the modern Make It Rain plugin with all dependencies

Write-Host "🌧️ Make It Rain - Enhanced Setup Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the plugin root directory." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Create necessary directories if they don't exist
$directories = @("dist", ".obsidian", "src/components", "src/hooks")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "📁 Created directory: $dir" -ForegroundColor Green
    }
}

# Copy modern styles to the correct location
if (Test-Path "styles_modern.css") {
    Copy-Item "styles_modern.css" "dist/styles_modern.css" -Force
    Write-Host "🎨 Copied modern styles" -ForegroundColor Green
}

# Build the plugin
Write-Host "🔨 Building plugin..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed. Check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the files from 'dist/' folder to your Obsidian vault's plugins folder"
Write-Host "2. Enable the plugin in Obsidian settings"
Write-Host "3. Configure your Raindrop.io API token"
Write-Host "4. Enable 'Modern UI' in plugin settings for the enhanced experience"
Write-Host ""
Write-Host "🔧 Features enabled:" -ForegroundColor Cyan
Write-Host "• Modern responsive UI with React components"
Write-Host "• MDX support for rich content"
Write-Host "• Animated transitions and micro-interactions"
Write-Host "• Mobile-optimized layouts"
Write-Host "• Full-screen modal popups for item details"
Write-Host "• Collection tree view with icons and colors"
Write-Host "• Advanced search and filtering"
Write-Host ""
