/**
 * 
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌   
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *  
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 * 
 * @fileoverview Post-build script to copy dist files to root and rename index.html
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Function to recursively copy directory contents
function copyRecursive(source, target, isRoot = true) {
  const files = readdirSync(source);
  
  for (const file of files) {
    const sourcePath = join(source, file);
    let targetPath;
    
    // If it's the root level index.html, rename it to LittleCUBES.html
    if (isRoot && file === 'index.html') {
      targetPath = join(target, 'LittleCUBES.html');
    } else {
      targetPath = join(target, file);
    }
    
    if (statSync(sourcePath).isDirectory()) {
      // Create directory if it doesn't exist
      if (!existsSync(targetPath)) {
        mkdirSync(targetPath, { recursive: true });
      }
      // Recursively copy directory contents
      copyRecursive(sourcePath, targetPath, false);
    } else {
      // Copy file
      copyFileSync(sourcePath, targetPath);
      console.log(`✓ Copied ${sourcePath.replace(projectRoot + '/', '')} to ${targetPath.replace(projectRoot + '/', '')}`);
    }
  }
}

try {
  const distDir = join(projectRoot, 'dist');
  
  // Copy all files from dist to root, renaming index.html to LittleCUBES.html
  copyRecursive(distDir, projectRoot);
  
  console.log('✓ Successfully copied all files from dist to root folder');
} catch (error) {
  console.error('Error copying files:', error.message);
  process.exit(1);
}
