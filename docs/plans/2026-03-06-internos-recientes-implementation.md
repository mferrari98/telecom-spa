# Internos Recientes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the 3 most frequently searched internos as a static text line below the search input in the internos modal, persisted per-browser via localStorage.

**Architecture:** Add localStorage helper functions and a `useRecientes` hook inside `internal-directory-dialog.tsx`. Record the top result when a search produces matches (debounced). Display a "Recientes:" line between the input and the results list.

**Tech Stack:** React (useState, useEffect, useRef), localStorage, existing component structure.

---

### Task 1: Add localStorage helpers and recientes type

**Files:**
- Modify: `apps/spa/components/internal-directory-dialog.tsx:1-45`

**Step 1: Add RecentEntry type after existing types (after line 45)**

```typescript
type RecentEntry = {
  label: string;
  internal: string;
  count: number;
};
```

**Step 2: Add localStorage read/write helpers after the type**

```typescript
const RECIENTES_KEY = "internos-recientes";
const MAX_STORED = 20;
const MAX_DISPLAYED = 3;

function loadRecientes(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECIENTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReciente(label: string, internal: string): void {
  const entries = loadRecientes();
  const existing = entries.find(
    (e) => e.label === label && e.internal === internal
  );

  if (existing) {
    existing.count++;
  } else {
    entries.push({ label, internal, count: 1 });
  }

  entries.sort((a, b) => b.count - a.count);
  localStorage.setItem(RECIENTES_KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
}

function getTopRecientes(): RecentEntry[] {
  return loadRecientes()
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_DISPLAYED);
}
```

### Task 2: Add recientes state and recording logic to the component

**Files:**
- Modify: `apps/spa/components/internal-directory-dialog.tsx` (inside `InternalDirectoryDialog` function)

**Step 1: Add state for recientes (after line 103, with other state)**

```typescript
const [recientes, setRecientes] = useState<RecentEntry[]>([]);
const lastRecordedQuery = useRef("");
```

**Step 2: Load recientes on mount (after the existing loadEntries useEffect, ~line 151)**

```typescript
useEffect(() => {
  setRecientes(getTopRecientes());
}, []);
```

**Step 3: Record top result when search produces matches (debounced)**

Add after the `extensionResults` useMemo (~line 326):

```typescript
useEffect(() => {
  if (extensionResults.length === 0) return;

  const topResult = extensionResults[0];
  const label = topResult.people[0]?.name || topResult.department;
  const key = `${label}:${topResult.extension}`;

  if (key === lastRecordedQuery.current) return;

  const timer = setTimeout(() => {
    lastRecordedQuery.current = key;
    saveReciente(label, topResult.extension);
    setRecientes(getTopRecientes());
  }, 1000);

  return () => clearTimeout(timer);
}, [extensionResults]);
```

### Task 3: Render recientes line in the modal

**Files:**
- Modify: `apps/spa/components/internal-directory-dialog.tsx` (JSX inside CommandList)

**Step 1: Add recientes display after the "Escriba al menos 2 caracteres" block (after ~line 466)**

Insert between the "2 caracteres" message and the search results block:

```tsx
{!loading && !error && searchQuery.trim().length < 2 && recientes.length > 0 ? (
  <div className="border-b px-3 pb-2 text-xs text-muted-foreground">
    <span className="font-medium">Recientes: </span>
    {recientes.map((entry, i) => (
      <span key={`${entry.label}-${entry.internal}`}>
        {i > 0 ? ", " : ""}
        {entry.label} int. {entry.internal}
      </span>
    ))}
  </div>
) : null}
```

### Task 4: Verify and commit

**Step 1: Verify syntax**

Run:
```bash
node -e "const fs = require('fs'); const c = fs.readFileSync('apps/spa/components/internal-directory-dialog.tsx','utf8'); let d=0; for(const ch of c){if(ch==='{')d++;if(ch==='}')d--;} console.log('balanced:', d===0);"
```

Expected: `balanced: true`

**Step 2: Commit**

```bash
git add apps/spa/components/internal-directory-dialog.tsx
git commit -m "feat: show 3 most frequent recent searches in internos modal

Persist search results in localStorage per-browser.
Display top 3 by frequency as static text below the search input."
```
