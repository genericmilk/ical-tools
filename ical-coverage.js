#!/usr/bin/env node

import ical from 'node-ical';
import { existsSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

function printUsage() {
  console.error('Usage: ical-coverage <file.ics> [--this-week | --this-month | --this-year | --from YYYY-MM-DD --to YYYY-MM-DD]');
  process.exit(1);
}

// Parse args
let file = null;
let filterFrom = null;
let filterTo = null;
let filterLabel = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--this-week') {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7)); // Monday
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 7);
    filterFrom = mon;
    filterTo = sun;
    filterLabel = 'this week';
  } else if (arg === '--this-month') {
    const now = new Date();
    filterFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    filterTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    filterLabel = 'this month';
  } else if (arg === '--this-year') {
    const now = new Date();
    filterFrom = new Date(now.getFullYear(), 0, 1);
    filterTo = new Date(now.getFullYear() + 1, 0, 1);
    filterLabel = 'this year';
  } else if (arg === '--from') {
    filterFrom = new Date(args[++i]);
    if (isNaN(filterFrom)) printUsage();
  } else if (arg === '--to') {
    filterTo = new Date(args[++i]);
    if (isNaN(filterTo)) printUsage();
    filterTo.setDate(filterTo.getDate() + 1); // inclusive
  } else if (!arg.startsWith('--')) {
    file = arg;
  } else {
    printUsage();
  }
}

if (!file) printUsage();

if (filterFrom && filterTo && !filterLabel) {
  filterLabel = `${args[args.indexOf('--from') + 1]} to ${args[args.indexOf('--to') + 1]}`;
}

const filePath = resolve(file);
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const data = ical.sync.parseFile(filePath);

// Accumulate duration in minutes per event summary
const durations = {};
let totalMinutes = 0;

for (const key of Object.keys(data)) {
  const event = data[key];
  if (event.type !== 'VEVENT') continue;

  const start = event.start;
  const end = event.end;
  if (!start || !end) continue;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (filterFrom && startDate < filterFrom) continue;
  if (filterTo && startDate >= filterTo) continue;

  const minutes = (endDate - startDate) / 60000;
  if (minutes <= 0) continue;

  const name = event.summary || '(no title)';
  durations[name] = (durations[name] || 0) + minutes;
  totalMinutes += minutes;
}

if (totalMinutes === 0) {
  console.log(`No events with duration found${filterLabel ? ` for ${filterLabel}` : ''}.`);
  process.exit(0);
}

// Sort by duration descending
const rows = Object.entries(durations)
  .map(([name, mins]) => ({ name, mins, pct: (mins / totalMinutes) * 100 }))
  .sort((a, b) => b.pct - a.pct);

function formatPct(pct) {
  return pct.toFixed(2) + '%';
}

function formatHours(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

// Calculate column widths
const nameHeader = 'Event';
const pctHeader = 'Coverage';
const hoursHeader = 'Hours';

const maxName = Math.max(nameHeader.length, ...rows.map(r => r.name.length));
const maxPct = Math.max(pctHeader.length, ...rows.map(r => formatPct(r.pct).length));
const maxHours = Math.max(hoursHeader.length, ...rows.map(r => formatHours(r.mins).length));

function row(name, pct, hours) {
  return `| ${name.padEnd(maxName)} | ${pct.padStart(maxPct)} | ${hours.padStart(maxHours)} |`;
}

function divider() {
  return `+-${'-'.repeat(maxName)}-+-${'-'.repeat(maxPct)}-+-${'-'.repeat(maxHours)}-+`;
}

console.log();
if (filterLabel) console.log(`  Showing: ${filterLabel}`);
console.log(divider());
console.log(row(nameHeader, pctHeader, hoursHeader));
console.log(divider());
for (const r of rows) {
  console.log(row(r.name, formatPct(r.pct), formatHours(r.mins)));
}
console.log(divider());
console.log();
console.log(`Total tracked: ${formatHours(totalMinutes)} across ${rows.length} event type(s)`);
console.log();
