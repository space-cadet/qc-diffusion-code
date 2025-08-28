// Minimal index.md reader/query helper for memory-bank/implementation-details/index.md
// Node 18+
// Usage examples (run from repo root):
//   pnpm run index tag boundary-conditions
//   pnpm run index task C14
//   pnpm run index recent "2025-08-26 00:00:00 IST"
//   pnpm run index export
//   pnpm run index validate

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX_PATH = resolve('memory-bank/implementation-details/index.md');

function readIndexFile(path = INDEX_PATH) {
  return readFileSync(path, 'utf8');
}

function extractBlock(md, fenceLang) {
  // Returns the first fenced code block matching ```<fenceLang> ... ```
  const re = new RegExp("```" + fenceLang + "\n([\\s\\S]*?)\n```", "m");
  const m = md.match(re);
  return m ? m[1].trim() : null;
}

function parseInverse(md) {
  const jsonText = extractBlock(md, 'json');
  if (!jsonText) return { tag_index: {}, task_index: {} };
  try {
    const obj = JSON.parse(jsonText);
    return {
      tag_index: obj.tag_index || {},
      task_index: obj.task_index || {}
    };
  } catch (e) {
    throw new Error('Failed to parse inverse indexes JSON block: ' + e.message);
  }
}

function parseEntries(md) {
  const jsonlText = extractBlock(md, 'jsonl');
  if (!jsonlText) return [];
  const lines = jsonlText.split('\n').map(s => s.trim()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch (e) {
      throw new Error('Invalid JSONL line: ' + line + ' -> ' + e.message);
    }
  }
  return entries;
}

// Utilities
function sortByUpdatedDesc(entries) {
  return [...entries].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
}

function unique(arr) {
  return [...new Set(arr)];
}

// Queries
function queryByTag(entries, tag) {
  return entries.filter(e => Array.isArray(e.tags) && e.tags.includes(tag));
}

function queryByTask(inverse, entries, taskId) {
  const ids = inverse.task_index?.[taskId] || [];
  const byId = Object.fromEntries(entries.map(e => [e.id, e]));
  return ids.map(id => byId[id]).filter(Boolean);
}

function queryRecent(entries, since) {
  // since: "YYYY-MM-DD HH:MM:SS IST"
  return entries.filter(e => (e.updated || '') > since);
}

// Validation: recompute tag_index from JSONL and compare
function recomputeTagIndex(entries) {
  const map = {};
  for (const e of entries) {
    for (const t of (e.tags || [])) {
      if (!map[t]) map[t] = [];
      map[t].push(e.id);
    }
  }
  for (const k of Object.keys(map)) {
    map[k] = unique(map[k]).sort();
  }
  return map;
}

function validate(inverse, entries) {
  const errors = [];

  // ids unique
  const ids = entries.map(e => e.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length) errors.push('Duplicate ids: ' + unique(dupIds).join(', '));

  // tag_index matches recomputed (treat missing keys as empty)
  const expected = recomputeTagIndex(entries);
  const actual = inverse.tag_index || {};
  const keys = unique([...Object.keys(expected), ...Object.keys(actual)]).sort();

  const diffs = [];
  for (const k of keys) {
    const a = (actual[k] || []).slice().sort();
    const b = (expected[k] || []).slice().sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push(`tag_index mismatch for "${k}": actual=${JSON.stringify(a)} expected=${JSON.stringify(b)}`);
    }
  }
  if (diffs.length) errors.push(...diffs);

  return { ok: errors.length === 0, errors };
}

// CLI
function main() {
  const md = readIndexFile();
  const inverse = parseInverse(md);
  const entries = parseEntries(md);

  const [cmd, ...rest] = process.argv.slice(2);
  const arg = rest[0];

  switch (cmd) {
    case 'tag': {
      if (!arg) { console.error('Usage: pnpm run index tag <tag>'); process.exit(1); }
      const out = queryByTag(entries, arg).map(({ id, title, path, updated }) => ({ id, title, path, updated }));
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'task': {
      if (!arg) { console.error('Usage: pnpm run index task <taskId>'); process.exit(1); }
      const out = sortByUpdatedDesc(queryByTask(inverse, entries, arg))
        .map(({ id, title, updated }) => ({ id, title, updated }));
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'recent': {
      if (!arg) { console.error('Usage: pnpm run index recent "YYYY-MM-DD HH:MM:SS IST"'); process.exit(1); }
      const out = sortByUpdatedDesc(queryRecent(entries, arg))
        .map(({ id, title, tags, path, updated }) => ({ id, title, tags, path, updated }));
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'export': {
      console.log(JSON.stringify(entries, null, 2));
      break;
    }
    case 'validate': {
      const res = validate(inverse, entries);
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.ok ? 0 : 2);
    }
    default: {
      if (!cmd) {
        console.error('Commands: tag <tag> | task <taskId> | recent <since> | export | validate');
      }
    }
  }
}

main();
