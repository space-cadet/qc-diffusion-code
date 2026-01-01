#!/usr/bin/env node

/**
 * Quantum Component Index Generator
 * 
 * This script analyzes the quantum package source code to generate 
 * a comprehensive component index document, focusing on:
 * - Hierarchical structure of components
 * - Component interfaces and implementations
 * - Interdependencies and functional relationships
 * 
 * Usage: ts-node generate-component-index.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = __dirname;
const srcDir = path.join(packageRoot, 'src');
const outputFile = path.join(packageRoot, 'component-index.md');
const backupFile = path.join(packageRoot, 'component-index.md.bak');

// Component level directories
const componentLevels = {
  'core': 0,
  'utils': 1,
  'states': 2,
  'operators': 3,
  'angularMomentum': 4,
  'circuits': 5
};

// --- Main Logic ---

// Helper to extract section content from the existing file
function extractSectionContent(content, sectionName) {
  const sectionRegex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  return match ? match[1].trim() : '';
}

// Helper to extract all existing sections from file
function extractAllSections(content) {
  const sections = {};
  const sectionRegex = /## (.*?)\n([\s\S]*?)(?=\n## |$)/g;
  let match;
  
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();
    sections[sectionName] = sectionContent;
  }
  
  return sections;
}

async function generateComponentIndex() {
  try {
    console.log('Analyzing quantum package structure...');
    
    // Create backup of existing file if it exists
    if (fs.existsSync(outputFile)) {
      fs.copyFileSync(outputFile, backupFile);
      console.log(`Backed up existing component index to ${backupFile}`);
    }

    // Read existing content to preserve manually written sections
    let existingContent = '';
    let existingSections = {};
    if (fs.existsSync(outputFile)) {
      existingContent = fs.readFileSync(outputFile, 'utf8');
      existingSections = extractAllSections(existingContent);
      console.log('Extracted existing sections to preserve manual content');
    }
    
    // Analyze directory structure
    const structure = {};
    
    // For each level directory, scan for TypeScript files
    for (const [dir, level] of Object.entries(componentLevels)) {
      const dirPath = path.join(srcDir, dir);
      
      // Skip if directory doesn't exist
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory ${dirPath} not found, skipping...`);
        continue;
      }
      
      // Find all TypeScript files in the directory
      const files = await glob('*.ts', {
        cwd: dirPath,
        ignore: ['index.ts', '*.test.ts', '*.spec.ts']
      });
      
      // Skip if no files found
      if (files.length === 0) {
        console.log(`No TypeScript files found in ${dirPath}, skipping...`);
        continue;
      }
      
      // Analyze each file
      structure[dir] = {
        level,
        files: files.map(file => {
          const filePath = path.join(dirPath, file);
          const relativePath = path.relative(srcDir, filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Extract exports with basic regex
          const exports = extractExports(content);
          
          // Extract imports for dependency analysis
          const imports = extractImports(content);
          
          return {
            name: path.basename(file, '.ts'),
            path: relativePath,
            exports,
            imports
          };
        })
      };
    }
    
    console.log('Finished analyzing package structure');
    
    // Generate markdown
    const timestamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let markdown = `*Last Updated: ${timestamp}*\n\n`;
    
    // Generate table of contents
    markdown += `# Table of Contents\n\n`;
    let tocIndex = 1;
    
    markdown += `${tocIndex++}. [Overview](#overview)\n`;
    markdown += `${tocIndex++}. [Core Types and Interfaces](#level-0-core-types-and-interfaces)\n`;
    markdown += `${tocIndex++}. [Utilities and Basic Operations](#level-1-utilities-and-basic-operations)\n`;
    markdown += `${tocIndex++}. [Quantum States](#level-2-quantum-states)\n`;
    markdown += `${tocIndex++}. [Quantum Operators](#level-3-quantum-operators)\n`;
    markdown += `${tocIndex++}. [Angular Momentum](#level-4-angular-momentum)\n`;
    markdown += `${tocIndex++}. [Quantum Circuits](#level-5-quantum-circuits-planned)\n`;
    markdown += `${tocIndex++}. [Dependency Graph](#dependency-graph)\n`;
    markdown += `${tocIndex++}. [Usage Example Dependencies](#usage-example-dependencies)\n`;
    markdown += `${tocIndex++}. [API Status and Stability](#api-status-and-stability)\n`;
    markdown += `${tocIndex++}. [Performance Considerations](#performance-considerations)\n`;
    markdown += `${tocIndex++}. [Implementation Index](#implementation-index)\n`;
    markdown += `${tocIndex++}. [Error Handling](#error-handling)\n`;
    markdown += `${tocIndex++}. [Testing and Validation](#testing-and-validation)\n`;
    markdown += `${tocIndex++}. [NPM Package](#npm-package)\n`;
    
    // Add Overview section (preserve existing)
    markdown += `\n## Overview\n`;
    if (existingSections['Overview']) {
      markdown += existingSections['Overview'] + '\n';
    } else {
      markdown += `This index provides a hierarchical view of the quantum package components, ordered by their dependencies. Components at each level may depend on components from previous levels but not on components from later levels.\n\n`;
      markdown += `The package implements a comprehensive quantum mechanics library in TypeScript, providing tools for quantum state manipulation, operator algebra, measurements, time evolution, and angular momentum calculations.\n`;
    }
    
    // Generate sections for each level
    for (let level = 0; level <= 5; level++) {
      const levelName = getLevelName(level);
      const levelDirs = Object.entries(componentLevels)
        .filter(([_, l]) => l === level)
        .map(([dir, _]) => dir);
      
      if (levelDirs.length === 0) continue;
      
      markdown += `\n## Level ${level}: ${levelName}\n`;
      
      // Check if we should preserve existing content for this section
      const sectionName = `Level ${level}: ${levelName}`;
      if (existingSections[sectionName]) {
        markdown += existingSections[sectionName] + '\n';
        continue;
      }
      
      markdown += `Location: \`src/${levelDirs[0]}/\`\n`;
      
      // For each directory at this level
      for (const dir of levelDirs) {
        if (!structure[dir]) continue;
        
        // For each file in this directory
        for (const file of structure[dir].files) {
          // Add file heading
          markdown += `\n### ${file.name} (\`${file.path}\`)\n`;
          
          // Add exports
          if (file.exports.interfaces.length > 0) {
            markdown += `\n**Interfaces:**\n`;
            for (const intf of file.exports.interfaces) {
              markdown += `- \`${intf}\`\n`;
            }
          }
          
          if (file.exports.classes.length > 0) {
            markdown += `\n**Classes:**\n`;
            for (const cls of file.exports.classes) {
              markdown += `- \`${cls}\`\n`;
            }
          }
          
          if (file.exports.functions.length > 0) {
            markdown += `\n**Functions:**\n`;
            for (const func of file.exports.functions) {
              markdown += `- \`${func}\`\n`;
            }
          }
          
          if (file.exports.types.length > 0) {
            markdown += `\n**Types:**\n`;
            for (const type of file.exports.types) {
              markdown += `- \`${type}\`\n`;
            }
          }
          
          if (file.exports.constants.length > 0) {
            markdown += `\n**Constants:**\n`;
            for (const constant of file.exports.constants) {
              markdown += `- \`${constant}\`\n`;
            }
          }
        }
      }
    }
    
    // Add remaining sections (preserve existing)
    const remainingSections = [
      'Dependency Graph',
      'Usage Example Dependencies',
      'API Status and Stability', 
      'Performance Considerations',
      'Implementation Index',
      'Error Handling',
      'Testing and Validation',
      'NPM Package'
    ];
    
    for (const section of remainingSections) {
      markdown += `\n## ${section}\n`;
      if (existingSections[section]) {
        markdown += existingSections[section] + '\n';
      } else {
        // Add placeholder content
        markdown += `*This section needs to be filled with appropriate content.*\n`;
      }
    }
    
    // Write output
    fs.writeFileSync(outputFile, markdown, 'utf8');
    
    console.log(`Component index successfully generated at ${outputFile}`);
    console.log('Manual sections were preserved. Please review and update as needed.');
    
  } catch (error) {
    console.error('Error generating component index:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper to extract exports from file content
function extractExports(content) {
  const exports = {
    interfaces: [],
    classes: [],
    functions: [],
    types: [],
    constants: []
  };
  
  // Extract interfaces
  const interfaceRegex = /export\s+interface\s+(\w+)/g;
  let match;
  while ((match = interfaceRegex.exec(content)) !== null) {
    exports.interfaces.push(match[1]);
  }
  
  // Extract classes
  const classRegex = /export\s+class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    exports.classes.push(match[1]);
  }
  
  // Extract functions
  const functionRegex = /export\s+function\s+(\w+)/g;
  while ((match = functionRegex.exec(content)) !== null) {
    exports.functions.push(match[1]);
  }
  
  // Extract types
  const typeRegex = /export\s+type\s+(\w+)/g;
  while ((match = typeRegex.exec(content)) !== null) {
    exports.types.push(match[1]);
  }
  
  // Extract constants
  const constRegex = /export\s+const\s+(\w+)/g;
  while ((match = constRegex.exec(content)) !== null) {
    exports.constants.push(match[1]);
  }
  
  return exports;
}

// Helper to extract imports for dependency analysis
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:{([^}]+)})?\s*(?:from\s+['"]([^'"]+)['"])?/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[2]) {
      // Extract the imported names and the source module
      const names = match[1] ? match[1].split(',').map(name => name.trim()) : [];
      imports.push({
        names,
        source: match[2]
      });
    }
  }
  
  return imports;
}

// Helper to get the name for a level
function getLevelName(level) {
  switch (level) {
    case 0: return 'Core Types and Interfaces';
    case 1: return 'Utilities and Basic Operations';
    case 2: return 'Quantum States';
    case 3: return 'Quantum Operators';
    case 4: return 'Angular Momentum';
    case 5: return 'Quantum Circuits';
    default: return `Level ${level}`;
  }
}

// Run the script
generateComponentIndex();
