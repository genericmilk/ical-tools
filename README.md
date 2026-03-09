# ical-tools

CLI tools for working with iCal (`.ics`) calendar files.

## Installation

```sh
npm install
npm link
```

`npm link` makes both commands available globally in your terminal.

## Tools

### `ical-coverage`

Analyse a calendar file and show how your time is distributed across event types.

```sh
ical-coverage <file.ics> [--this-week | --this-month | --this-year | --from YYYY-MM-DD --to YYYY-MM-DD]
```

**Example output:**

```
  Showing: this month
+--------------------------+----------+--------+
| Event                    | Coverage |  Hours |
+--------------------------+----------+--------+
| Team Standup             |   35.42% |  8h 30m |
| 1:1 with Manager         |   20.83% |  5h 0m  |
| Project Planning         |   18.75% |  4h 30m |
| Code Review              |   25.00% |  6h 0m  |
+--------------------------+----------+--------+

Total tracked: 24h 0m across 4 event type(s)
```

**Options:**

| Flag | Description |
|------|-------------|
| `--this-week` | Filter to the current week (Mon–Sun) |
| `--this-month` | Filter to the current calendar month |
| `--this-year` | Filter to the current year |
| `--from YYYY-MM-DD` | Start of custom date range (inclusive) |
| `--to YYYY-MM-DD` | End of custom date range (inclusive) |

---

### `ical-compare`

Compare two iCal files and list events that were added or removed.

```sh
ical-compare <before.ics> <after.ics>
```

**Example output:**

```
Comparing: before.ics  →  after.ics
────────────────────────────────────────────────────────────

Removed (1):
  - Quarterly Review  [Tue, Jan 16, 2024, 02:00 PM GMT → Tue, Jan 16, 2024, 04:00 PM GMT]

Added (2):
  + New Project Kickoff  [Thu, Jan 18, 2024, 10:00 AM GMT → Thu, Jan 18, 2024, 11:00 AM GMT]
  + Doctor Appointment  [Fri, Jan 19, 2024, 08:30 AM GMT → Fri, Jan 19, 2024, 09:00 AM GMT]

────────────────────────────────────────────────────────────
1 removed  2 added  2 unchanged
```

**Options:**

| Flag | Description |
|------|-------------|
| `--no-color` | Plain text output, useful for piping or scripts |
| `--by-name` | Match events by title + start date instead of UID. Use this when your calendar app regenerates UIDs on every export (common with Google Calendar) |
