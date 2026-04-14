

# Plan: Build Coach Invoices Page

## Summary
Create a new Orders & Invoices page for coaches, add it to the sidebar navigation and routing. The page shows coach-paid transactions grouped by `stripe_payment_intent_id`, with search/filter, receipt modal, and PDF export via jsPDF.

## Changes

### File 1: `src/components/AppSidebar.tsx`
- Add `Receipt` to the lucide-react import (line 1-6)
- Insert `{ title: "Orders & Invoices", url: "/coach/invoices", icon: Receipt }` between "Client Results" (line 49) and "AI Chat" (line 50) in `coachNav`

### File 2: `src/App.tsx`
- Import `CoachInvoices` from `@/pages/coach/CoachInvoices`
- Add route `<Route path="/coach/invoices" element={<RoleGuard allowedRoles={["coach"]}><CoachInvoices /></RoleGuard>} />` after line 87 (ClientResults route)

### File 3: `src/pages/coach/CoachInvoices.tsx` (new)
~400-500 line component with:

**Data loading:**
- Query `coach_clients` where `coach_user_id = user.id` and `stripe_payment_intent_id IS NOT NULL`
- Join `instruments` on `instrument_id = id` for `instrument_name`
- Join `users` on `client_email = email` for `full_name`
- Group by `stripe_payment_intent_id` into transaction objects with: payment_intent_id, created_at, client_email, client_name, instruments[], total_amount (count × $29.99), status (Completed/In Progress/Sent derived from invitation_status)

**Search & filter bar:**
- Text search (client name/email), instrument dropdown (All + 4 instruments), date from, date to, Clear Filters button
- All client-side filtering

**Table:**
- Columns: Date (MMM d, yyyy), Client, Assessments, Amount ($XX.XX), Status (colored Badge), Actions (View Receipt + Export PDF)

**Receipt modal:**
- Dialog showing BrainWise header, date, truncated payment intent ID, client info, itemized instruments at $29.99, total, status

**Export options (above table):**
- "Export All as PDF" — all filtered transactions
- "Export by Client" — dropdown of client names, exports that client's transactions
- "Export Range as PDF" — uses existing date filters

**PDF generation:**
- jsPDF: BrainWise header, title, generated date, filter description, transaction table rows, confidential footer
- Filename: `BrainWise-Invoices-[date].pdf`

## Technical details
- Uses same patterns as CoachClients: `useAuth`, `supabase` client, `format` from date-fns, shadcn components
- jsPDF already in package.json (used by `generateResultsPdf.ts`)
- No database changes needed — all data exists in `coach_clients`, `instruments`, `users` tables
- Coach RLS policies already allow reading their own `coach_clients` rows and their clients' `users` rows

