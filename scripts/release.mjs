#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = packageJson.version;
const tag = `v${version}`;

console.log(`\n🚀 Starting release process for version ${version}...\n`);

try {
  // Step 1: Build
  console.log('📦 Building plugin...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Build successful\n');

  // Step 2: Check git status
  console.log('🔍 Checking git status...');
  const gitStatus = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf-8' });
  if (!gitStatus.trim()) {
    console.log('⚠️  No changes to commit. Skipping commit step.\n');
  } else {
    // Step 3: Stage all changes
    console.log('📝 Staging changes...');
    execSync('git add -A', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Changes staged\n');

    // Step 4: Commit
    console.log(`💾 Committing with message: "Release ${tag}"`);
    execSync(`git commit -m "Release ${tag}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Committed\n');
  }

  // Step 5: Create tag
  console.log(`🏷️  Creating tag: ${tag}`);
  try {
    execSync(`git tag -a ${tag} -m "Release ${tag}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Tag created\n');
  } catch (error) {
    console.log(`⚠️  Tag ${tag} already exists. Skipping tag creation.\n`);
  }

  // Step 6: Push to GitHub
  console.log('🌐 Pushing to GitHub...');
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Pushed to main branch\n');

  console.log('🏷️  Pushing tags...');
  execSync('git push origin --tags', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Tags pushed\n');

  // Step 7: Display release info
  console.log('═'.repeat(50));
  console.log('✨ Release Complete! ✨');
  console.log('═'.repeat(50));
  console.log(`\n📌 Version: ${version}`);
  console.log(`🏷️  Tag: ${tag}`);
  console.log(`📂 Build output: build/`);
  
  const releaseFilesPath = path.join(rootDir, 'build', 'release-files.txt');
  if (fs.existsSync(releaseFilesPath)) {
    console.log(`\n📦 Release files (manifest):`);
    console.log(fs.readFileSync(releaseFilesPath, 'utf-8'));
  } else {
      console.log(`\n📦 Release files:`);
      console.log(`  - build/main.js`);
      console.log(`  - build/manifest.json`);
      console.log(`  - build/styles.css`);
      console.log(`  - build/versions.json`);
      if (fs.existsSync(path.join(rootDir, 'build', 'styles_modern.css'))) {
        console.log(`  - build/styles_modern.css`);
      }
  }

  console.log(`\n🔗 GitHub: https://github.com/frostmute/make-it-rain/releases/tag/${tag}`);
  console.log(`\n💡 Next steps:`);
  console.log(`  1. Go to GitHub releases page`);
  console.log(`  2. Edit the ${tag} release`);
  console.log(`  3. Add release notes from RELEASE_NOTES_v${version}.md`);
  console.log(`  4. Upload build files as release assets (see list above)`);
  console.log(`\n✅ Ready for BRAT import!\n`);

} catch (error) {
  console.error('\n❌ Release failed:', error.message);
  process.exit(1);
}
