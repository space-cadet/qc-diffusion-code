# Quantum Component Index Generator

This script automatically generates and updates the `component-index.md` file for the quantum package by analyzing the source code structure and extracting component information.

## Features

- Analyzes TypeScript source files to extract exported interfaces, classes, functions, types, and constants
- Preserves manually written sections from the existing index file
- Organizes components hierarchically based on the dependency levels
- Maintains consistent formatting and structure
- Creates a backup of the existing file before making changes

## Usage

### Prerequisites

Make sure you have Node.js and npm installed. You'll also need the following npm packages:
- glob

Install them using:
```bash
npm install glob
```

### Running the Script

From the quantum package directory:

```bash
node generate-component-index.js
```

Or if you're using TypeScript directly:

```bash
ts-node generate-component-index.ts
```

### Integration with Build Process

You can add this script to your package.json:

```json
"scripts": {
  "generate-docs": "node generate-component-index.js",
  "prebuild": "npm run generate-docs"
}
```

## How It Works

1. The script scans the source directories following the hierarchical structure
2. It extracts exported components from each file
3. If an existing component-index.md file exists:
   - A backup is created as component-index.md.bak
   - Manually written sections are preserved
4. The script generates a new index with:
   - Updated component listings
   - Preserved manual content
   - Consistent formatting

## Customization

You can customize the script behavior by modifying:

- `componentLevels`: Define which directories belong to which levels
- `extractExports`: Adjust the regex patterns to better match your code style
- The table of contents and section organization

## Notes

- **Manual Sections**: Some sections like "Overview" and "Performance Considerations" are preserved from the existing file
- **Review Required**: Always review the generated file for accuracy
- **Formatting**: The script follows the established formatting conventions of the existing document
