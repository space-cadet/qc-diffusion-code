import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../memory-bank');
const targetDir = path.resolve(__dirname, '../memory-bank');

const fileMetadata = {};

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(sourceDir, srcPath);
    
    // Skip node_modules and other build artifacts
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Copy all files except hidden files
      if (!entry.name.startsWith('.')) {
        fs.copyFileSync(srcPath, destPath);
        
        // Get file stats for metadata
        const stats = fs.statSync(srcPath);
        fileMetadata[relativePath] = {
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      }
    }
  }
}

copyDir(sourceDir, targetDir);

// Write metadata file
fs.writeFileSync(
  path.join(targetDir, 'metadata.json'),
  JSON.stringify(fileMetadata, null, 2)
);

console.log('Copied memory-bank to frontend/memory-bank');
console.log('Created metadata.json with file sizes and modification dates');
