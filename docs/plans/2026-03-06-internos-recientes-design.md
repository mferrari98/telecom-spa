# Internos Recientes - Design

## Goal
Show the 3 most frequently searched internos below the search input as a non-interactive reference line, persisted per-browser via localStorage.

## Storage
- Key: `internos-recientes`
- Format: `{label: string, internal: string, count: number}[]`
- Max stored: 20 entries (pruned to top 20 by count on write)
- Displayed: top 3 by count

## When to record
When the user types a query (>=2 chars) that produces results, record the first visible result (highest-scored extension group's first person name + internal). Debounce ~1s so rapid typing doesn't spam entries.

## Display
Text line below input, before results: `Recientes: Matias Ferrari int. 2234, Telecomunicaciones int. 2234, Antonio Calandra int. 2207`
Small muted text. Hidden when no recientes stored.

## Scope
- Only `internal-directory-dialog.tsx` changes
- No backend/API changes
- No new files (localStorage only)
