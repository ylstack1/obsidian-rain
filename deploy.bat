@echo off
echo 🚀 Make It Rain Enhanced - Windows Deployment Script
echo =============================================

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if we're in a git repository
if not exist ".git" (
    echo ❌ Not a git repository. Please run 'git init' first.
    pause
    exit /b 1
)

echo 📋 Current git status:
git status --short

echo.
echo 🔍 Checking for changes...
for /f %%i in ('git status --porcelain') do (
    set HAS_CHANGES=1
    goto :has_changes
)

echo ✅ Working directory is clean
goto :check_push

:has_changes
echo 📝 Found changes to commit:
git status --short

echo.
set /p COMMIT_CHOICE=🤔 Do you want to commit these changes? (y/N): 

if /i "%COMMIT_CHOICE%"=="y" (
    echo 📦 Staging all changes...
    git add .
    
    echo 💬 Committing changes...
    git commit -m "Enhanced Make It Rain v2.0.0 - Modern UI with React, MDX support, and responsive design"
    
    echo ✅ Changes committed successfully!
) else (
    echo ⏩ Skipping commit...
)

:check_push
echo.
echo 🏷️ Creating release tag v2.0.0...
git tag -a "v2.0.0" -m "Release v2.0.0 - Enhanced Modern UI" 2>nul
if errorlevel 1 (
    echo ⚠️ Tag might already exist or creation failed
) else (
    echo ✅ Tag v2.0.0 created successfully!
)

echo.
echo 📤 Preparing to push to repository...
set /p PUSH_CHOICE=🤔 Push to origin? (y/N): 

if /i "%PUSH_CHOICE%"=="y" (
    echo 🚀 Pushing commits and tags...
    git push origin main
    git push origin --tags
    echo ✅ Successfully pushed to repository!
) else (
    echo ⏩ Skipping push. Run manually: git push origin main ^&^& git push origin --tags
)

echo.
echo 🎉 Deployment process completed!
echo.
echo 📋 Next steps:
echo 1. Create a GitHub release from the v2.0.0 tag
echo 2. Upload the files from dist/ folder to the release  
echo 3. Add release notes from RELEASE_NOTES.md
echo 4. Announce the enhanced version to users
echo.
echo 📁 Release files ready in dist/:
dir dist\

pause
