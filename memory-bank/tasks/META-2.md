# META-2: Document Indexing System
*Created: 2025-08-28 18:04:00 IST*
*Last Updated: 2025-08-28 18:04:00 IST*

**Description**: Ongoing development and maintenance of the text-based document indexing system (index.md + prompts.md) and query tooling.
**Status**: 🔄 ACTIVE
**Priority**: MEDIUM
**Started**: 2025-08-28 18:04:00 IST
**Last Active**: 2025-08-28 18:04:00 IST
**Dependencies**: None

## Scope
- Maintain `implementation-details/index.md` inverse indexes and JSONL entries
- Maintain `implementation-details/prompts.md` prompts catalog and inverse indexes
- Provide query tooling and validation (`scripts/index-query.js`)
- Keep index consistent, greppable, and KIRSS (no DB unless needed)

## Completion Criteria (rolling)
- Index and prompts files exist and parse (JSON/JSONL blocks valid)
- Inverse indexes equal recomputed values (no drift)
- Query helper script runs: `pnpm run index validate` returns ok
- Common queries supported: tag, task, recent, export

## Related Files
- `memory-bank/implementation-details/index.md`
- `memory-bank/implementation-details/prompts.md`
- `scripts/index-query.js`
- `memory-bank/tasks.md`

## Progress
1. ✅ Created `prompts.md` with initial prompts and indexes
2. ✅ Added `scripts/index-query.js` and wired npm script
3. 🔄 Expand prompts set; keep inverse indexes in sync

## Notes
KIRSS approach favored. Consider SQLite/FTS derivative only if scale/queries justify.
