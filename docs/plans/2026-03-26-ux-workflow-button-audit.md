# UX Workflow & Button Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix confusing, redundant, and illogical button flows across all phases of the RFE Foam Pro job lifecycle.

**Architecture:** This is a pure UI/UX refactor — no backend changes, no data model changes. All work is in React component files. Changes are additive (renaming labels, consolidating buttons, adding context indicators). No new dependencies needed.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React icons

---

## AUDIT FINDINGS SUMMARY

### Current Phase Flow
```
Draft → EstimateStage → Work Order → WorkOrderStage → [Crew] → InvoiceStage → Paid
```

### Issues Found (Prioritized)

| # | Severity | Phase | Issue | File |
|---|---|---|---|---|
| 1 | HIGH | ActionBar (All) | No visible status label in ActionBar — buttons change silently by status, user has no context | `components/calculator/ActionBar.tsx` |
| 2 | HIGH | ActionBar | "Sold / Work Order" label is ambiguous — unclear it means "mark this job as sold" | `components/calculator/ActionBar.tsx:65` |
| 3 | MEDIUM | EstimateStage | "Save Estimate" and "Save & PDF" are two separate top-level buttons doing nearly the same thing | `components/EstimateStage.tsx` |
| 4 | MEDIUM | WorkOrderStage | "Continue Editing" and "Back (←)" likely do the same thing — confusing duplication | `components/WorkOrderStage.tsx` |
| 5 | MEDIUM | CalculatorHeader | "Finalize & Send" in CalculatorHeader AND "Review & Finalize Estimate" in ActionBar are duplicate next-step CTAs shown simultaneously | `components/calculator/CalculatorHeader.tsx:33`, `components/calculator/ActionBar.tsx:32` |
| 6 | LOW | Dashboard | No confirmation dialog before deleting an estimate | `components/Dashboard.tsx` |
| 7 | LOW | ActionBar | "Work Order" status shows two action buttons side by side (Schedule + Invoice) with no hierarchy — both appear equal weight | `components/calculator/ActionBar.tsx:49-63` |
| 8 | LOW | CrewDashboard | "View Sheet" button renders as disabled "No Sheet" with no tooltip explaining why | `components/CrewDashboard.tsx` |

---

## DETAILED TASKS

---

### Task 1: Add Phase Status Label to ActionBar

**Problem:** The ActionBar renders completely different buttons depending on `currentStatus`, but there is no visible indicator telling the admin what phase they are currently in. A user returning to an estimate has no orientation.

**Files:**
- Modify: `components/calculator/ActionBar.tsx:22-69`

**Step 1: Add a status header strip above the buttons**

In `ActionBar.tsx`, above the existing `<div className="md:col-span-2 flex...">`, add a small status context label that maps the raw status string to a human-readable phase + color:

```tsx
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  Draft:      { label: 'Phase 1 of 5 — Draft Estimate',       color: 'text-slate-500 bg-slate-100' },
  'Work Order': { label: 'Phase 2 of 5 — Work Order',         color: 'text-amber-700 bg-amber-100' },
  Scheduled:  { label: 'Phase 3 of 5 — Scheduled',            color: 'text-blue-700 bg-blue-100' },
  Invoiced:   { label: 'Phase 4 of 5 — Awaiting Payment',     color: 'text-sky-700 bg-sky-100' },
  Paid:       { label: 'Phase 5 of 5 — Complete',             color: 'text-emerald-700 bg-emerald-100' },
};
```

Then render it above the button row:
```tsx
{STATUS_LABELS[currentStatus] && (
  <div className={`md:col-span-2 text-center py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 ${STATUS_LABELS[currentStatus].color}`}>
    {STATUS_LABELS[currentStatus].label}
  </div>
)}
```

**Step 2: Test manually**
- Open an estimate in Draft status → confirm "Phase 1 of 5 — Draft Estimate" appears above buttons
- Mark as sold → confirm "Phase 2 of 5 — Work Order" shows
- Check each status transition shows correct label

**Step 3: Commit**
```bash
git add components/calculator/ActionBar.tsx
git commit -m "feat: add phase status label to ActionBar for orientation"
```

---

### Task 2: Rename "Sold / Work Order" to "Mark as Sold →"

**Problem:** `components/calculator/ActionBar.tsx:65` — The label "Sold / Work Order" with an icon of HardHat is cryptic. A new user does not know this button transitions the job status. "Mark as Sold →" clearly communicates the intent.

**Files:**
- Modify: `components/calculator/ActionBar.tsx:65-67`

**Step 1: Change the button label**

Find:
```tsx
<HardHat className="w-4 h-4" /> Sold / Work Order <ArrowRight className="w-4 h-4" />
```

Replace with:
```tsx
<HardHat className="w-4 h-4" /> Mark as Sold → Create Work Order
```

Or shorter:
```tsx
<HardHat className="w-4 h-4" /> Mark as Sold <ArrowRight className="w-4 h-4" />
```

**Step 2: Test**
- Open a Draft estimate → confirm button reads "Mark as Sold →"
- Click it → confirm it still transitions to WorkOrderStage correctly

**Step 3: Commit**
```bash
git add components/calculator/ActionBar.tsx
git commit -m "fix: rename 'Sold / Work Order' button to 'Mark as Sold' for clarity"
```

---

### Task 3: Remove Duplicate Next-Step CTA Between CalculatorHeader and ActionBar

**Problem:** When status is `Draft`, both `CalculatorHeader` (line 33) and `ActionBar` (line 32) render a "go to EstimateStage" button:
- Header renders: **"Finalize & Send →"** (pill button, center of page)
- ActionBar renders: **"Review & Finalize Estimate"** (full-width button, bottom of page)

Both call `onStageEstimate`. This is redundant and confusing — user sees two different-looking buttons for the same action.

**Decision:** Keep the CalculatorHeader pill button (it's prominent and contextual in the progress flow). Remove the duplicate from ActionBar for the `Draft` state, OR clearly differentiate them with different labels if there's a reason to keep both.

**Recommended fix:** Remove the ActionBar "Review & Finalize Estimate" button when status = Draft and let the CalculatorHeader pill be the sole CTA.

**Files:**
- Modify: `components/calculator/ActionBar.tsx:28-35`

**Step 1: Remove the Draft-status button from ActionBar**

Find and delete:
```tsx
{currentStatus === 'Draft' && (
  <button
    onClick={onStageEstimate}
    className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
  >
    <FileCheck className="w-4 h-4" /> Review & Finalize Estimate
  </button>
)}
```

**Step 2: Verify the CalculatorHeader pill still handles Draft navigation**

In `CalculatorHeader.tsx` line 33, confirm:
```tsx
if (currentStatus === 'Draft') return { label: 'Finalize & Send', icon: FileCheck, action: onStageEstimate, ... };
```
This remains. No changes needed here.

**Step 3: Test**
- Open new estimate → only ONE next-step button shows (the pill in the header)
- ActionBar for Draft should now only show "Save / Update"
- Click pill → goes to EstimateStage correctly

**Step 4: Commit**
```bash
git add components/calculator/ActionBar.tsx
git commit -m "fix: remove duplicate 'Review & Finalize' CTA from ActionBar — header pill is sole Draft CTA"
```

---

### Task 4: Consolidate "Save Estimate" and "Save & PDF" in EstimateStage

**Problem:** Two primary buttons exist at the top of EstimateStage that do nearly the same thing. Users are forced to decide between them without understanding the difference at a glance.

**Files:**
- Modify: `components/EstimateStage.tsx` (find header action buttons section)

**Step 1: Read the current button implementations**

Open `components/EstimateStage.tsx` and locate both save buttons. Identify what `onSaveAndPDF` does differently from `onSave`.

**Step 2: Combine into one primary button with a secondary PDF option**

Option A — Split button (recommended):
```tsx
<div className="flex gap-1">
  <button onClick={onSave} className="bg-slate-900 text-white px-6 py-3 rounded-l-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
    <Save className="w-4 h-4" /> Save Estimate
  </button>
  <button onClick={onSaveAndPDF} className="bg-slate-700 text-white px-4 py-3 rounded-r-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border-l border-slate-600" title="Save and download PDF">
    <Download className="w-4 h-4" />
  </button>
</div>
```

Option B — Single button with tooltip:
```tsx
<button onClick={onSave} ...>
  <Save className="w-4 h-4" /> Save
</button>
<button onClick={onSaveAndPDF} ...>
  <Download className="w-4 h-4" /> PDF
</button>
```

**Step 3: Test**
- Open EstimateStage → confirm header has one primary "Save" area
- PDF button/icon still works
- Both still save correctly

**Step 4: Commit**
```bash
git add components/EstimateStage.tsx
git commit -m "fix: consolidate Save and Save+PDF buttons in EstimateStage header"
```

---

### Task 5: Remove "Continue Editing" / Reconcile with "Back" in WorkOrderStage

**Problem:** WorkOrderStage likely has both a "← Back" button and a "Continue Editing" button that navigate to the same place (Calculator view). This is redundant and adds cognitive load.

**Files:**
- Modify: `components/WorkOrderStage.tsx`

**Step 1: Read WorkOrderStage.tsx**

Locate all navigation/cancel buttons. Identify what each does on click.

**Step 2: Keep only one — rename to "← Back to Calculator"**

Remove whichever button is more hidden/secondary. Keep the one that's most visually prominent and rename it clearly:
```tsx
<button onClick={onBack} className="...">
  <ArrowLeft className="w-4 h-4" /> Back to Calculator
</button>
```

**Step 3: Test**
- Open WorkOrderStage → only one back-navigation button exists
- Click it → returns to Calculator with job state intact

**Step 4: Commit**
```bash
git add components/WorkOrderStage.tsx
git commit -m "fix: consolidate back-navigation in WorkOrderStage to single labeled button"
```

---

### Task 6: Add Confirmation Dialog Before Deleting an Estimate

**Problem:** Dashboard allows deleting estimates with a single click and no confirmation. Accidental deletes are unrecoverable if Supabase RLS or soft-delete is not configured.

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: Find the delete button handler**

Search for `onDelete` or `trash` icon usage in `Dashboard.tsx`. Locate the click handler.

**Step 2: Wrap delete in a native confirm or inline modal**

Simplest fix — use `window.confirm`:
```tsx
const handleDelete = (id: string, customerName: string) => {
  if (!window.confirm(`Delete estimate for ${customerName}? This cannot be undone.`)) return;
  onDeleteEstimate(id);
};
```

Better fix — inline confirmation state:
```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

// In the row:
{confirmDeleteId === estimate.id ? (
  <div className="flex gap-1">
    <button onClick={() => { onDeleteEstimate(estimate.id); setConfirmDeleteId(null); }} className="text-red-600 text-xs font-black uppercase">Confirm Delete</button>
    <button onClick={() => setConfirmDeleteId(null)} className="text-slate-500 text-xs font-black uppercase">Cancel</button>
  </div>
) : (
  <button onClick={() => setConfirmDeleteId(estimate.id)} className="text-slate-400 hover:text-red-500">
    <Trash2 className="w-4 h-4" />
  </button>
)}
```

**Step 3: Test**
- Click delete on any estimate → confirm prompt appears
- Click Cancel → nothing deleted
- Click Confirm → estimate removed

**Step 4: Commit**
```bash
git add components/Dashboard.tsx
git commit -m "feat: add confirmation step before deleting an estimate from Dashboard"
```

---

### Task 7: Add Visual Hierarchy to Work Order Dual-Button Row

**Problem:** When status = `Work Order` with a scheduled date, the ActionBar shows two side-by-side buttons: "Edit Work Order" and "Finalize & Invoice". Both have equal visual weight but very different consequences. "Finalize & Invoice" is a major irreversible-feeling action and should be primary.

**Files:**
- Modify: `components/calculator/ActionBar.tsx:54-63`

**Step 1: Make "Finalize & Invoice" the dominant button**

Current styling gives both buttons `flex-1`. Adjust:
- "Edit Work Order" → smaller, secondary styling (ghost/outline)
- "Finalize & Invoice" → larger, prominent (emerald, with shadow)

```tsx
{!activeScheduledDate ? (
  <button onClick={onStageWorkOrder} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-200">
    <Calendar className="w-4 h-4" /> Schedule Job
  </button>
) : (
  <div className="flex-1 flex gap-2 items-center">
    <button onClick={onStageWorkOrder} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
      <Pencil className="w-4 h-4" /> Edit
    </button>
    <button onClick={onStageInvoice} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
      <ClipboardList className="w-4 h-4" /> Finalize & Invoice
    </button>
  </div>
)}
```

**Step 2: Test**
- Set a scheduled date on a Work Order → "Edit" is small/secondary, "Finalize & Invoice" is large/primary
- Both still function correctly

**Step 3: Commit**
```bash
git add components/calculator/ActionBar.tsx
git commit -m "fix: elevate 'Finalize & Invoice' as primary CTA in Work Order dual-button row"
```

---

### Task 8: Add Tooltip to Disabled "No Sheet" Button in CrewDashboard

**Problem:** Crew members see a greyed-out "No Sheet" button with no explanation. They don't know if the sheet is missing, loading, or if it's an error.

**Files:**
- Modify: `components/CrewDashboard.tsx`

**Step 1: Find the "No Sheet" button**

Search for `No Sheet` or `workOrderSheetUrl` in `CrewDashboard.tsx`.

**Step 2: Add a title tooltip**

```tsx
{workOrderSheetUrl ? (
  <button onClick={() => window.open(workOrderSheetUrl, '_blank')} className="...">
    <FileText className="w-4 h-4" /> View Sheet
  </button>
) : (
  <button disabled className="... opacity-40 cursor-not-allowed" title="No work order sheet has been attached to this job yet. Contact your supervisor.">
    <FileText className="w-4 h-4" /> No Sheet
  </button>
)}
```

**Step 3: Test**
- Open a job without a sheet URL → hover over "No Sheet" button → tooltip explains why
- Open a job with a sheet URL → "View Sheet" works normally

**Step 4: Commit**
```bash
git add components/CrewDashboard.tsx
git commit -m "fix: add tooltip to disabled 'No Sheet' button in CrewDashboard"
```

---

## EXECUTION ORDER

Run tasks in this order to minimize merge conflicts:

```
Task 1 → Task 2 → Task 3   (all in ActionBar.tsx — batch or sequential)
Task 4                       (EstimateStage.tsx — isolated)
Task 5                       (WorkOrderStage.tsx — isolated)
Task 6                       (Dashboard.tsx — isolated)
Task 7                       (ActionBar.tsx — after Task 1-3 settled)
Task 8                       (CrewDashboard.tsx — isolated)
```

---

## TESTING CHECKLIST (Full Regression)

After all tasks complete, manually walk the full job lifecycle:

- [ ] Create new estimate → only one "next step" CTA visible
- [ ] Phase label shows "Phase 1 of 5" in ActionBar
- [ ] Save works from ActionBar ("Save / Update")
- [ ] Click CalculatorHeader pill → goes to EstimateStage
- [ ] EstimateStage: save button consolidated, PDF still accessible
- [ ] Return to Calculator, click "Mark as Sold" → goes to WorkOrderStage
- [ ] WorkOrderStage: only one back button, labeled clearly
- [ ] Phase label shows "Phase 2 of 5" after marking sold
- [ ] Set scheduled date → dual-button row shows "Edit" (small) + "Finalize & Invoice" (large)
- [ ] Crew: login as crew user, see job list, hover "No Sheet" → tooltip shows
- [ ] Crew: start job, complete job, completion modal works
- [ ] Admin: see job as "Completed / Review Needed" on Dashboard
- [ ] Admin: open invoice stage, save, mark paid
- [ ] Phase label shows "Phase 5 of 5 — Complete"
- [ ] Dashboard: attempt delete → confirmation appears → cancel works → confirm deletes

---

## FILES TOUCHED (Summary)

| File | Tasks |
|---|---|
| `components/calculator/ActionBar.tsx` | 1, 2, 3, 7 |
| `components/calculator/CalculatorHeader.tsx` | 3 (read-only verification) |
| `components/EstimateStage.tsx` | 4 |
| `components/WorkOrderStage.tsx` | 5 |
| `components/Dashboard.tsx` | 6 |
| `components/CrewDashboard.tsx` | 8 |

**No backend changes. No new dependencies. No schema changes.**

---

*Generated: 2026-03-26 | Auditor: Claude Sonnet 4.6 | App: RFE Foam Pro*
