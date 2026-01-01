#!/usr/bin/env tsx

/**
 * Quantum Component Index Generator
 * 
 * This script generates a comprehensive component index for the quantum package
 * by analyzing source files and extracting component information.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// --- Configuration ---
const packageRoot = process.cwd();
const srcDir = path.join(packageRoot, 'src');
const outputFile = path.join(packageRoot, 'component-index.md');
const backupFile = path.join(packageRoot, 'component-index.md.bak');

console.log(`Package root: ${packageRoot}`);
console.log(`Source directory: ${srcDir}`);

// Define component levels based on directories
const componentLevels = {
  'core': 0,
  'utils': 1,
  'states': 2,
  'operators': 3,
  'angularMomentum': 4,
  'circuits': 5
};

// --- Type Definitions ---
interface ComponentInfo {
  name: string;
  path: string;
  level: number;
  exports: {
    interfaces: string[];
    classes: string[];
    functions: string[];
    types: string[];
    constants: string[];
  };
  imports: { 
    names: string[]; 
    source: string; 
  }[];
}

interface DirectoryInfo {
  level: number;
  components: ComponentInfo[];
}

// --- Helper Functions ---

/**
 * Extracts exports from file content using regex
 */
function extractExports(content: string) {
  const exports = {
    interfaces: [] as string[],
    classes: [] as string[],
    functions: [] as string[],
    types: [] as string[],
    constants: [] as string[]
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

/**
 * Extracts imports from file content using regex
 */
function extractImports(content: string) {
  const imports = [] as { names: string[], source: string }[];
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

/**
 * Extracts all sections from the existing file
 */
function extractAllSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionRegex = /## ([^#\n]+?)\n([\s\S]*?)(?=\n## |$)/g;
  let match;
  
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();
    sections[sectionName] = sectionContent;
  }
  
  return sections;
}

/**
 * Gets the level name based on numeric level
 */
function getLevelName(level: number): string {
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

// --- Main Function ---

async function generateComponentIndex() {
  try {
    console.log('Analyzing quantum package structure...');
    
    // Check if source directory exists
    if (!fs.existsSync(srcDir)) {
      throw new Error(`Source directory not found: ${srcDir}`);
    }
    
    // Create backup of existing file if it exists
    if (fs.existsSync(outputFile)) {
      fs.copyFileSync(outputFile, backupFile);
      console.log(`Backed up existing component index to ${backupFile}`);
    }

    // Read existing content to preserve manually written sections
    let existingContent = '';
    let existingSections: Record<string, string> = {};
    if (fs.existsSync(outputFile)) {
      existingContent = fs.readFileSync(outputFile, 'utf8');
      existingSections = extractAllSections(existingContent);
      console.log('Extracted existing sections to preserve manual content');
    }
    
    // Scan directories and collect components
    const structure: Record<string, DirectoryInfo> = {};
    
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
        ignore: ['*.test.ts', '*.spec.ts']
      });
      
      // Skip if no files found
      if (files.length === 0) {
        console.log(`No TypeScript files found in ${dirPath}, skipping...`);
        continue;
      }
      
      console.log(`Found ${files.length} files in ${dir}/`);
      
      // Analyze each file
      structure[dir] = {
        level,
        components: []
      };
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const relativePath = path.relative(srcDir, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract exports with basic regex
        const exports = extractExports(content);
        
        // Extract imports for dependency analysis
        const imports = extractImports(content);
        
        // Create component info
        const component: ComponentInfo = {
          name: path.basename(file, '.ts'),
          path: relativePath,
          level,
          exports,
          imports
        };
        
        // Add to structure
        structure[dir].components.push(component);
        
        // Log found components
        const totalExports = exports.interfaces.length + 
                            exports.classes.length + 
                            exports.functions.length + 
                            exports.types.length + 
                            exports.constants.length;
        
        console.log(`  - ${file}: Found ${totalExports} exports`);
      }
    }
    
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
      
      // Skip levels with no directories
      if (levelDirs.length === 0) continue;
      
      // Check if we have any components at this level
      const hasComponents = levelDirs.some(dir => 
        structure[dir] && structure[dir].components.length > 0
      );
      
      if (!hasComponents) {
        console.log(`No components found for level ${level}: ${levelName}`);
        continue;
      }
      
      // Add level header
      markdown += `\n## Level ${level}: ${levelName}\n`;
      
      // Check if we should preserve existing content for this section
      const sectionKey = `Level ${level}: ${levelName}`;
      if (existingSections[sectionKey]) {
        markdown += existingSections[sectionKey] + '\n';
        continue;
      }
      
      // Add location
      markdown += `Location: \`src/${levelDirs[0]}/\`\n`;
      
      // For each directory at this level
      for (const dir of levelDirs) {
        if (!structure[dir] || !structure[dir].components.length) continue;
        
        // For each file in this directory
        for (const component of structure[dir].components) {
          // Skip files with no exports
          const totalExports = component.exports.interfaces.length + 
                              component.exports.classes.length + 
                              component.exports.functions.length + 
                              component.exports.types.length + 
                              component.exports.constants.length;
          
          if (totalExports === 0) continue;
          
          // Add component heading
          markdown += `\n### ${component.name} (\`${component.path}\`)\n`;
          
          // Add exports
          if (component.exports.interfaces.length > 0) {
            markdown += `\n**Interfaces:**\n`;
            for (const intf of component.exports.interfaces) {
              markdown += `- \`${intf}\`\n`;
            }
          }
          
          if (component.exports.classes.length > 0) {
            markdown += `\n**Classes:**\n`;
            for (const cls of component.exports.classes) {
              markdown += `- \`${cls}\`\n`;
            }
          }
          
          if (component.exports.functions.length > 0) {
            markdown += `\n**Functions:**\n`;
            for (const func of component.exports.functions) {
              markdown += `- \`${func}\`\n`;
            }
          }
          
          if (component.exports.types.length > 0) {
            markdown += `\n**Types:**\n`;
            for (const type of component.exports.types) {
              markdown += `- \`${type}\`\n`;
            }
          }
          
          if (component.exports.constants.length > 0) {
            markdown += `\n**Constants:**\n`;
            for (const constant of component.exports.constants) {
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
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
generateComponentIndex();
