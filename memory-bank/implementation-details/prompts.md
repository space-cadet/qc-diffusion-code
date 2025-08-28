# Prompts Index

Purpose: Fast lookup and reuse of task-oriented prompts; machine-parseable like `index.md`.

## Metadata
```json
{ "generated_at": "2025-08-28 17:01:05 IST", "version": "1" }
```

## Inverse Indexes (inline source of truth)
```json
{
  "tag_index": {
    "retrieval": ["by-tag-list","by-task-recent","entry-by-id","recent-updates","bc-reading-list"],
    "tags": ["by-tag-list"],
    "tasks": ["by-task-recent"],
    "sorting": ["by-task-recent"],
    "lookup": ["entry-by-id"],
    "recency": ["recent-updates"],
    "filter": ["recent-updates"],
    "boundary-conditions": ["bc-reading-list"],
    "reading-list": ["bc-reading-list"],
    "maintenance": ["validate-index"],
    "validation": ["validate-index"],
    "export": ["export-json-array"],
    "json": ["export-json-array"]
  },
  "use_case_index": {
    "recency": ["recent-updates"],
    "onboarding": ["bc-reading-list"],
    "maintenance": ["validate-index"],
    "export": ["export-json-array"]
  }
}
```

## Entries (JSONL)
One JSON object per line. Fields: id, title, prompt, purpose, tags, inputs, outputs, updated, examples?.

```jsonl
{ "id":"by-tag-list", "title":"List docs by tag", "prompt":"From index.md, return all entries for tag = {{tag}} as an array of {id,title,path,updated}.", "purpose":"Fast retrieval by tag", "tags":["retrieval","tags"], "inputs":["tag"], "outputs":"Array of entries with id,title,path,updated", "updated":"2025-08-28 17:01:05 IST" }
{ "id":"by-task-recent", "title":"Docs by task, recent first", "prompt":"Given task = {{task_id}}, return related ids with titles sorted by updated desc.", "purpose":"Task-centric navigation", "tags":["retrieval","tasks","sorting"], "inputs":["task_id"], "outputs":"Array of {id,title,updated}", "updated":"2025-08-28 17:01:05 IST" }
{ "id":"entry-by-id", "title":"Get entry by id", "prompt":"Return the JSONL entry where id = {{id}}.", "purpose":"Direct lookup", "tags":["lookup"], "inputs":["id"], "outputs":"Single JSON object", "updated":"2025-08-28 17:01:05 IST" }
{ "id":"recent-updates", "title":"Recently updated docs", "prompt":"List entries updated after {{since}} with {id,title,tags,path,updated}.", "purpose":"Recency filter", "tags":["recency","filter","retrieval"], "inputs":["since"], "outputs":"Array of entries", "updated":"2025-08-28 17:57:21 IST" }
{ "id":"bc-reading-list", "title":"Boundary conditions reading list", "prompt":"From index.md, return top BC docs (architecture and implementation) with 1-line rationale each.", "purpose":"Onboarding for BC work", "tags":["boundary-conditions","pde","reading-list","retrieval"], "inputs":[], "outputs":"Array of {id,title,why}", "updated":"2025-08-28 17:57:21 IST" }
{ "id":"validate-index", "title":"Validate index structure", "prompt":"Parse inverse indexes and JSONL; verify JSON parse per line, unique ids, and that tag_index/task_index equal recomputed versions; report diffs.", "purpose":"Maintenance/validation", "tags":["maintenance","validation"], "inputs":[], "outputs":"Validation report with any diffs/errors", "updated":"2025-08-28 17:57:21 IST" }
{ "id":"export-json-array", "title":"Export entries as JSON array", "prompt":"Convert JSONL entries block into a single JSON array and print it.", "purpose":"Programmatic export", "tags":["export","json"], "inputs":[], "outputs":"One JSON array of entries", "updated":"2025-08-28 17:57:21 IST" }
```