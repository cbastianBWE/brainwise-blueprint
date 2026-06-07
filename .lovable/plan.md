# CRM P3.1 — Navigation, routes, list pages, dialogs

Add a CRM section to the operations area. No changes to existing billing pages, RPCs, or `operations-types.ts`. All ops table access via `opsSupabase.from("<table>" as any)`; writes are direct inserts/updates (RLS handles org scoping).

## 1. Sidebar — `src/components/AppSidebar.tsx`
- Add `UserPlus` to the existing `lucide-react` import.
- Insert a CRM group **immediately before** the existing Operations "Customers" item:
  - `{ title: "Leads", url: "/operations/leads", icon: UserPlus, sectionHeader: "CRM" }`
  - `{ title: "Accounts", url: "/operations/accounts", icon: Building2 }`
  - `{ title: "Contacts", url: "/operations/contacts", icon: UsersRound }`
  - `{ title: "Deals", url: "/operations/deals", icon: Briefcase }`

## 2. Routes — `src/App.tsx`
Import four new pages from `./pages/operations/...`. Add four routes mirroring existing operations route shape:
```
<Route path="/operations/leads" element={
  <RoleGuard allowedRoles={["brainwise_super_admin"]}>
    <SuperAdminSessionProvider><OperationsLeads /></SuperAdminSessionProvider>
  </RoleGuard>
} />
```
Same for `/operations/accounts`, `/operations/contacts`, `/operations/deals`.

## 3. List pages (in `src/pages/operations/`)
Each mirrors `OperationsCustomers.tsx`: page header + "New" button, Card + Table, `cursor-pointer` rows that open the edit dialog seeded with the row. TanStack Query keys `["ops","<entity>","list"]`.

- **OperationsLeads.tsx** — `leads` select `id, salutation, first_name, last_name, company_name_text, email, phone, score, created_at, status:lead_statuses(name,color), source:picklist_values!leads_source_id_fkey(label)`, filter `archived_at is null`, order `created_at desc`. Columns: Name, Company, Email, Status (`status?.name`), Score. New → `LeadFormDialog`.
- **OperationsAccounts.tsx** — `accounts` select `id, name, type, domain, website, created_at`, order `name`. Columns: Name, Type, Domain. New → `AccountFormDialog`.
- **OperationsContacts.tsx** — `contact_persons` select `id, first_name, last_name, email, title, account:accounts!contact_persons_account_id_fkey(name)`, order `last_name`. Columns: Name, Title, Email, Account (`account?.name`). New → `ContactCrmFormDialog`.
- **OperationsDeals.tsx** — `deals` select `id, name, amount, currency_code, close_date, created_at, stage:deal_stages(name), account:accounts(name)`, order `created_at desc`. Columns: Name, Account, Amount (`formatMoney` from `_shared`), Stage (`stage?.name`), Close date (`formatDate`). New → `DealFormDialog`.

## 4. Dialogs (in `src/pages/operations/`)
Mirror `CustomerFormDialog.tsx`: controlled `open`/`onOpenChange`, optional `row` prop for edit, `useEffect` seeding buffer, `useQueryClient` invalidating `["ops","<entity>","list"]` on save, toast success/error. Writes via `opsSupabase.from("<table>" as any).insert(...) / .update(...).eq("id", ...)`. Send only provided fields.

- **LeadFormDialog.tsx** — fields: `last_name`* , `first_name`, `salutation`, `company_name_text`*, `email`, `phone`, `title`; `status_id` Select from `lead_statuses` (order `sort_order`); `source_id` Select from `picklist_values where picklist_type = 'lead_source'`. Do not set `org_id`/`score`/`owner` (server defaults).
- **AccountFormDialog.tsx** — `name`*, `type` Select (`customer|prospect|partner|vendor|reseller`, default `prospect`), `domain`, `website`, `phone`; `industry_id` Select from `picklist_values where picklist_type = 'industry'`.
- **ContactCrmFormDialog.tsx** — `first_name`, `last_name`, `email`, `phone`, `title`; `account_id` Select from `accounts` (order `name`). On insert set `created_from: 'direct'`. Separate from existing `ContactFormDialog.tsx` (which is untouched).
- **DealFormDialog.tsx** — `name`*, `account_id`* Select from `accounts`, `amount` (number), `close_date` (date). Before insert resolve default pipeline + first open stage:
  1. `pipelines` where `is_default = true` → pipeline id
  2. `deal_stages` where `pipeline_id = <that> AND is_won = false AND is_lost = false AND is_active = true` order `sort_order` limit 1
  3. insert `deals` with `pipeline_id`, `stage_id`, plus `name`, `account_id`, `amount`, `close_date`. Do not set `probability` or stage history (triggers handle).

## Constraints
- No edits to `src/integrations/supabase/operations-types.ts`, any RPC, or any existing billing/operations page besides `AppSidebar.tsx` and `App.tsx`.
- No RPC calls in this prompt; all writes are direct table inserts/updates relying on RLS.
