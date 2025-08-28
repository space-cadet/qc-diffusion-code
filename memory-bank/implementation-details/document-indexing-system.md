# Document Indexing System Implementation

Created: 2025-08-28 18:12:38 IST
Last Updated: 2025-08-28 18:12:38 IST

## Overview

Text-based document indexing system for memory-bank/implementation-details/ using KIRSS principles. Provides fast lookup, validation, and query capabilities without database complexity.

## Architecture

### Core Components

**index.md** - Master index with inverse lookups and JSONL entries
- Purpose header and metadata block
- Inverse indexes (tag_index, task_index) as inline JSON
- JSONL entries section with doc metadata per line

**prompts.md** - Reusable query prompts catalog
- Mirrors index.md structure (metadata, inverse indexes, JSONL)
- Prompt entries with template variables, inputs, outputs
- Enables consistent query patterns

**scripts/index-query.js** - Node.js query helper
- Parses JSON/JSONL blocks from index files
- CLI commands: tag, task, recent, export, validate
- Validation ensures inverse indexes match recomputed values

### File Structure

```
memory-bank/implementation-details/
├── index.md                    # Master document index
├── prompts.md                  # Query prompts catalog
├── README.md                   # Generation/reading instructions
├── boundary-conditions/        # Subdirectory docs included
└── *.md                       # Individual implementation docs
```

## Data Schema

### Index Entry (JSONL)
```json
{
  "id": "doc-slug",
  "title": "Human Title", 
  "path": "memory-bank/implementation-details/file.md",
  "summary": "≤220-char compressed summary",
  "tags": ["tag1","tag2"],
  "tasks": ["C12","C14"],
  "updated": "YYYY-MM-DD HH:MM:SS IST",
  "related": ["other-doc-id"]
}
```

### Prompt Entry (JSONL)
```json
{
  "id": "prompt-slug",
  "title": "Prompt Title",
  "prompt": "Template with {{variables}}",
  "purpose": "What this accomplishes",
  "tags": ["retrieval","validation"],
  "inputs": ["variable_names"],
  "outputs": "Expected result format",
  "updated": "YYYY-MM-DD HH:MM:SS IST"
}
```

## Usage Patterns

### Query Operations
```bash
# By tag
pnpm run index tag boundary-conditions

# By task
pnpm run index task C14

# Recent updates
pnpm run index recent "2025-08-26 00:00:00 IST"

# Export all entries
pnpm run index export

# Validate structure
pnpm run index validate
```

### Maintenance
- Keep summaries ≤220 chars, decision-focused
- Normalize tags (bc → boundary-conditions)
- Use stable IDs even if files move
- Update inverse indexes when entries change
- Validate regularly: `pnpm run index validate`

## Design Decisions

**Text-first approach** - Git-friendly, greppable, no external dependencies
**Inline inverse indexes** - O(1) tag/task lookups without file parsing
**JSONL entries** - One doc per line, easy to append/edit
**Compressed summaries** - Focus on decisions/implementation status
**Stable IDs** - Filename-based slugs, update path if moved

## Future Extensions

**SQLite derivative** - If scale/queries justify (>200 docs, complex filters)
**Full-text search** - FTS5 for content search beyond tags
**Vector search** - Semantic retrieval via embeddings
**Derived artifacts** - Pure JSON exports for programmatic use

## Related Files

- `memory-bank/tasks/META-2.md` - Ongoing maintenance task
- `package.json` - npm script: "index": "node scripts/index-query.js"
- All `*.md` files in implementation-details/ and subdirectories

## Implementation Status

✅ Core index.md structure with inverse indexes and JSONL entries
✅ Prompts catalog with query templates and inverse indexes  
✅ Node.js query helper with CLI commands
✅ README documentation for generation/reading
✅ npm script integration
✅ Task META-2 created for ongoing maintenance

System is production-ready for current scale (~20 docs). Consider database approach only when complexity/scale justifies additional infrastructure.