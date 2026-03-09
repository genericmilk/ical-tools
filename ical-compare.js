#!/usr/bin/env node
import ical from 'node-ical';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function usage() {
  console.error(`Usage: ical-compare <before.ics> <after.ics>

Compare two iCal files and list events that were added or removed.

Arguments:
  before.ics  The original calendar file
  after.ics   The updated calendar file

Options:
  --no-color  Disable colored output
  --by-name   Match events by summary+date instead of UID (useful for
              calendars that regenerate UIDs on every export)
`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { color: true, byName: false, files: [] };

  for (const arg of args) {
    if (arg === '--no-color') opts.color = false;
    else if (arg === '--by-name') opts.byName = true;
    else if (arg.startsWith('-')) { console.error(`Unknown option: ${arg}`); usage(); }
    else opts.files.push(arg);
  }

  if (opts.files.length !== 2) usage();
  return opts;
}

function formatDate(dt) {
  if (!dt) return 'no date';
  if (dt.dateOnly) {
    // All-day event
    return dt.toISOString().slice(0, 10);
  }
  return dt.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function eventLabel(ev) {
  const summary = ev.summary || '(no title)';
  const start = formatDate(ev.start);
  const end = ev.end ? ` → ${formatDate(ev.end)}` : '';
  return `${summary}  [${start}${end}]`;
}

function eventKey(ev, byName) {
  if (byName) {
    const summary = (ev.summary || '').trim().toLowerCase();
    const start = ev.start ? ev.start.toISOString() : '';
    return `${summary}::${start}`;
  }
  return ev.uid;
}

function loadEvents(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const raw = readFileSync(abs, 'utf8');
  const parsed = ical.sync.parseICS(raw);
  const events = new Map();

  for (const [, comp] of Object.entries(parsed)) {
    if (comp.type !== 'VEVENT') continue;
    events.set(comp.uid, comp);
  }

  return events;
}

function compare(beforeMap, afterMap, byName) {
  // If byName, re-key by name+date
  const rekey = (map) => {
    if (!byName) return map;
    const out = new Map();
    for (const ev of map.values()) {
      out.set(eventKey(ev, true), ev);
    }
    return out;
  };

  const before = rekey(beforeMap);
  const after = rekey(afterMap);

  const removed = [];
  const added = [];
  let unchanged = 0;

  for (const [key, ev] of before) {
    if (after.has(key)) unchanged++;
    else removed.push(ev);
  }

  for (const [key, ev] of after) {
    if (!before.has(key)) added.push(ev);
  }

  // Sort by start date
  const byStart = (a, b) => {
    const ta = a.start ? a.start.getTime() : 0;
    const tb = b.start ? b.start.getTime() : 0;
    return ta - tb;
  };

  removed.sort(byStart);
  added.sort(byStart);

  return { removed, added, unchanged };
}

function c(code, text, useColor) {
  return useColor ? `${code}${text}${RESET}` : text;
}

function printResults({ removed, added, unchanged }, opts) {
  const { color } = opts;
  const [beforeFile, afterFile] = opts.files;

  console.log('');
  console.log(c(BOLD, `Comparing: ${beforeFile}  →  ${afterFile}`, color));
  console.log(c(DIM, '─'.repeat(60), color));
  console.log('');

  if (removed.length === 0 && added.length === 0) {
    console.log(c(BOLD, 'No differences found.', color));
    console.log(c(DIM, `(${unchanged} events in common)`, color));
    return;
  }

  if (removed.length > 0) {
    console.log(c(BOLD + RED, `Removed (${removed.length}):`, color));
    for (const ev of removed) {
      console.log(c(RED, `  - ${eventLabel(ev)}`, color));
    }
    console.log('');
  }

  if (added.length > 0) {
    console.log(c(BOLD + GREEN, `Added (${added.length}):`, color));
    for (const ev of added) {
      console.log(c(GREEN, `  + ${eventLabel(ev)}`, color));
    }
    console.log('');
  }

  const parts = [];
  if (removed.length) parts.push(c(RED, `${removed.length} removed`, color));
  if (added.length) parts.push(c(GREEN, `${added.length} added`, color));
  parts.push(c(DIM, `${unchanged} unchanged`, color));

  console.log(c(DIM, '─'.repeat(60), color));
  console.log(parts.join('  '));
  console.log('');
}

// --- Main ---
const opts = parseArgs();
const before = loadEvents(opts.files[0]);
const after = loadEvents(opts.files[1]);
const results = compare(before, after, opts.byName);
printResults(results, opts);
