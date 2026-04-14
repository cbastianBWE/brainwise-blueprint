

# Plan: Add Purchase History Section to BillingSettings

## Single file: `src/pages/BillingSettings.tsx`

### 1. Add imports (after line 11)
- `Dialog, DialogContent, DialogHeader, DialogTitle` from ui/dialog
- `Input` from ui/input
- `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` from ui/table
- `FileText, Search` from lucide-react
- `format, parseISO` from date-fns
- `jsPDF` from jspdf

### 2. Add state variables (after line 17, `portalLoading`)
- `purchases` array state with typed shape (id, instrument_id, instrument_name, amount_paid, stripe_payment_intent_id, purchased_at)
- `purchasesLoading` (default true)
- `purchaseSearch` (default '')
- `receiptItem` (default null)

### 3. Add useEffect to load purchases (after new state vars)
- Fetch from `assessment_purchases` filtered by `user_id`
- Fetch `instruments` to build a name lookup map
- Map instrument names onto purchase rows

### 4. Add `filteredPurchases` derived variable (after useEffect)
- Filter by instrument_name or formatted date matching `purchaseSearch`

### 5. Add `exportPurchasesPdf` function (after `handleManage`)
- Uses jsPDF to generate a clean PDF with BrainWise header, table of filtered purchases, and confidential footer

### 6. Add Purchase History Card in JSX (after the Upgrade to Premium card, before closing `</div>`)
- Card with header containing title + Export PDF button
- Search input with Search icon
- Table with columns: Date, Assessment, Amount, Transaction, Actions
- Each row has a Receipt button that opens a Dialog
- Receipt Dialog shows BrainWise header, date, transaction ID, line item with amount, total, and description text
- Empty/loading states handled

### No other files changed

