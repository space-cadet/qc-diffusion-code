# Implementation Details Index — README

This folder contains `index.md`, a machine-friendly, human-readable index of implementation docs under `memory-bank/implementation-details/` (including the `boundary-conditions/` subfolder).

## What `index.md` contains
- Purpose header and metadata block with `generated_at` and `version`.
- Inverse indexes block: a compact JSON object with `tag_index` and `task_index`.
- Entries section as JSONL (one JSON object per line) describing each document.

## JSONL entry schema
Each entry is a single line JSON object with the following fields:

```json
{
  "id": "slug-from-filename",
  "title": "Human Title",
  "path": "memory-bank/implementation-details/.../file.md",
  "summary": "≤220-char compressed summary focused on decisions/implementation.",
  "tags": ["tag1","tag2"],
  "tasks": ["T12","T14"],        // optional
  "updated": "YYYY-MM-DD HH:MM:SS IST",
  "related": ["other-doc-id"]     // optional
}
```

Conventions:
- `id` = slugified filename without extension (stable, even if moved).
- `summary` ≤ 220 chars; avoid fluff; prefer what it enables/decides.
- Tags are normalized (e.g., `bc` → `boundary-conditions`). Use 3–7 tags.
- Times use `YYYY-MM-DD HH:MM:SS IST`.
- `path` may include subfolders (e.g., `boundary-conditions/...`).

## How to generate/update `index.md`
1) Discover docs
- Include all `*.md` under `memory-bank/implementation-details/` and its `boundary-conditions/` subfolder.
- Exclude `index.md` and this `README.md`.

2) Parse lightweight metadata
- Read first ~60 lines to extract `# Title`, Created/Last Updated (if present), and early context.

3) Create compressed summary
- Summarize decisions/implementation status in ≤220 chars.

4) Assign tags (3–7)
- From title, repeated nouns, section headers, and domain terms.
- Normalize synonyms (e.g., `bc` → `boundary-conditions`, `solver` → `solvers`).

5) Infer tasks (optional)
- Detect explicit task IDs (`T12`, `T14`, etc.).

6) Write JSONL entries
- Append one line per doc in the Entries section.

7) Build inverse indexes
- `tag_index`: tag → sorted unique list of `id`s.
- `task_index`: task → sorted unique list of `id`s.
- Replace the JSON object in the Inverse Indexes block.

8) Validate
- Ensure valid JSONL (each line parses), unique `id`s, sorted/deduped lists.

## Reading and querying the index
Examples using `jq`:

- List all doc ids for a tag (e.g., boundary-conditions):
```bash
awk '/^\{\s*"id"/{print}' memory-bank/implementation-details/index.md | \
  jq -r '.id' >/dev/null # sanity (parses)
```
Use the inverse index at the top (fastest):
```bash
awk '/^\{/{f=1} f{print} /\}```/{f=0}' memory-bank/implementation-details/index.md | \
  sed '1,/^```json$/d;/^```$/,$d' | jq -r '.tag_index["boundary-conditions"][]'
```

- Convert the JSONL entries to a structured array:
```bash
sed -n '/^```jsonl$/,/^```$/p' memory-bank/implementation-details/index.md | \
  sed '1d;$d' | jq -s '. | map(fromjson)'
```

- Find entries tagged with `pde`:
```bash
sed -n '/^```jsonl$/,/^```$/p' memory-bank/implementation-details/index.md | \
  sed '1d;$d' | jq -c 'fromjson | select(.tags|index("pde"))'
```

## Maintenance tips
- Keep edits small and incremental (block edits).
- When a doc changes, update its entry’s `summary`, `updated`, and indexes.
- Prefer stable `id`s even if the file path changes; update `path` instead.
- If programmatic consumption without Markdown is needed, generate a derived `tag-index.json` from the inline inverse index.
