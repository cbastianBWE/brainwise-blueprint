## Surface no-op result in CompletionConfirmDialog

Edit one file: `src/components/learning-admin/CompletionConfirmDialog.tsx`, function `handleConfirm` (~lines 109–170).

### Changes

1. Add `let data: any = null;` alongside the existing `let error` at the top of the try block.

2. In each of the three `set_*_completion` branches (content_item, module, curriculum), capture `data` in addition to `error`:
   ```ts
   error = (res as any).error;
   data = (res as any).data;
   ```
   Leave the cert_path branch (`grant_certification`/`revoke_certification`) untouched — it has no `changed` field, and the strict `=== false` check below handles it correctly.

3. After `if (error) throw error;`, replace the unconditional success toast with a branched version:
   ```ts
   const changed = data?.changed;
   if (changed === false) {
     toast({
       title: "No change",
       description:
         data?.note ??
         "This item was already in the requested state. No change was made.",
     });
   } else {
     toast({
       title: target.complete ? "Marked complete" : "Marked incomplete",
       description: target.entityName,
     });
   }
   qc.invalidateQueries({ queryKey: invalidateKey as unknown as any[] });
   onClose();
   ```

### Preserved

- `qc.invalidateQueries` and `onClose` run in both branches.
- "No change" toast uses the default (neutral) variant — not destructive.
- `mapErrorMessage`, `sideEffectLine`, `actionTitle`, RPC params, and dialog JSX are unchanged.
- Cert path grant/revoke toast behavior unchanged (falls through to the else).
- Real failures still hit the destructive "Action failed" toast.

### Acceptance check

- Reverse a module/curriculum whose required children are all complete → neutral "No change" toast with backend `note`, tree still shows complete.
- Genuine downgrade → "Marked incomplete" as before.
- Cert path grant/revoke → unchanged toast.
- RPC error → unchanged destructive toast.
