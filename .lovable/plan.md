# Plan: Extend estimate conversion options

Scope: `src/pages/operations/OperationsEstimateDetail.tsx` only. Additive — no other files touched. Follows existing patterns (`supabase.rpc("..." as any, ...)`, `toast`, `invalidateEstimate()`, `navigate`).

## Changes

1. **Imports** — add if missing: `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`, `Input`, `Label`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`.

2. **State** (near existing `useState` calls):
   - `projectDialogOpen`, `projName`, `projBilling` (`"none" | "project_hours" | "task_hours" | "staff_hours"`).

3. **Derived values** after `const status = ...`:
   - `convertedInvoiceId`, `convertedProjectId`, `convertedRetainerId` from `est.converted_*_id`.
   - `alreadyConverted` boolean.
   - Update `canConvert` to require `!alreadyConverted` (instead of `status !== "invoiced"`).

4. **Handlers** next to `handleConvert`:
   - `handleConvertRetainer()` → calls `ops_convert_estimate_to_retainer`, navigates to `/operations/retainers/{id}`.
   - `openProjectConvert()` → seeds dialog defaults (name `Project - {estimate_number}`, billing `none`) and opens it.
   - `handleConvertProject()` → calls `ops_convert_estimate_to_project` with `p_name` and `p_billing_method`, navigates to `/operations/projects/{id}`.

5. **Header action area** — replace the single "Convert to invoice" button with a `DropdownMenu` ("Convert" trigger) containing "To invoice" / "To project" / "To retainer". When `alreadyConverted`, render a "View invoice/project/retainer" button that navigates to whichever converted id exists.

6. **Project conversion dialog** — added just before the component's final closing tag (alongside the existing AlertDialog). Contains:
   - Project name `Input`.
   - Billing method `Select` (No hourly billing / Project hourly / Task hourly / Staff hourly).
   - Helper text explaining that "No hourly billing" copies line items as billable charges, while hourly methods use the estimate total as budget only.
   - Footer: Cancel + Create project (disabled while `converting`).

## Notes
- No changes to scoring, saving, queries, RPCs, or other files.
- RPC names (`ops_convert_estimate_to_project`, `ops_convert_estimate_to_retainer`) and the `converted_*_id` columns are referenced via `as any`, matching the existing style for ops RPCs in this file.
