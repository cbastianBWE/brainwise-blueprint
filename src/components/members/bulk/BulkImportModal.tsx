import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ImportReference, ImportResult } from "./types";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const importReferenceQuery = useQuery({
    queryKey: ["get_learning_import_reference"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_learning_import_reference" as any, {} as any);
      if (error) throw error;
      return data as ImportReference;
    },
    staleTime: 60_000,
  });

  const handleDownloadTemplate = () => {
    const ref = importReferenceQuery.data;
    if (!ref) {
      toast({ title: "Reference data still loading…", variant: "destructive" });
      return;
    }
    const wb = XLSX.utils.book_new();
    const assignments = [
      ["operation", "type", "target_name", "user_email", "reason"],
      [
        "assign",
        "curriculum",
        ref.curricula[0]?.name ?? "Curriculum name",
        ref.mentors[0]?.email ?? "someone@example.com",
        "Example justification text",
      ],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assignments), "Assignments");

    const certNames = ref.certification_paths.map((c) => c.name);
    const curNames = ref.curricula.map((c) => c.name);
    const modNames = ref.modules.map((m) => m.name);
    const mentorEmails = ref.mentors.map((m) => m.email ?? "");
    const max = Math.max(certNames.length, curNames.length, modNames.length, mentorEmails.length);
    const refRows: string[][] = [["Certification Paths", "Curricula", "Modules", "Mentor Emails"]];
    for (let i = 0; i < max; i++) {
      refRows.push([
        certNames[i] ?? "",
        curNames[i] ?? "",
        modNames[i] ?? "",
        mentorEmails[i] ?? "",
      ]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refRows), "Reference");
    XLSX.writeFile(wb, "learning-admin-import-template.xlsx");
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file.name);
    setImporting(true);
    setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.includes("Assignments") ? "Assignments" : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = json
        .map((r, idx) => ({
          row_number: idx + 2,
          operation: String(r.operation ?? "").trim(),
          type: String(r.type ?? "").trim(),
          target_name: String(r.target_name ?? "").trim(),
          user_email: String(r.user_email ?? "").trim(),
          reason: String(r.reason ?? "").trim(),
        }))
        .filter((r) => r.operation || r.type || r.target_name || r.user_email || r.reason);
      if (rows.length === 0) {
        toast({ title: "No rows found in the spreadsheet", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("learning-admin-import", {
        body: { rows },
      });
      if (error) throw error;
      setImportResult(data as ImportResult);
      queryClient.invalidateQueries({ queryKey: ["members-search"] });
      queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
    } catch (err) {
      toast({
        title: "Import failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (importing && !next) return;
    if (!next) {
      setImportResult(null);
      setSelectedFile(null);
    }
    onOpenChange(next);
  };

  const failedRows = (importResult?.rows ?? []).filter((r) => r.status !== "success" && r.status !== "ok");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import assignments</DialogTitle>
          <DialogDescription>
            Download the template, fill it in, then upload to process all rows in one shot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-semibold">Step 1: Download template</div>
            <p className="text-xs text-muted-foreground">
              The template includes a Reference sheet with available certifications, curricula,
              modules, and mentor emails.
            </p>
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={!importReferenceQuery.data}>
              <Download className="mr-2 h-4 w-4" />
              Download .xlsx template
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Step 2: Upload completed file</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelected}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
              {selectedFile && (
                <span className="text-xs text-muted-foreground">{selectedFile}</span>
              )}
            </div>
          </div>

          {importing && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Importing rows…
            </div>
          )}

          {importResult && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
              <div>
                Total: <span className="font-semibold">{importResult.total}</span> | Succeeded:{" "}
                <span className="font-semibold text-emerald-600">{importResult.succeeded}</span> |
                Failed:{" "}
                <span className="font-semibold text-destructive">{importResult.failed}</span>
              </div>
              {failedRows.length > 0 && (
                <div className="max-h-48 overflow-y-auto border-t pt-2 text-xs">
                  <div className="mb-1 font-semibold">Failures:</div>
                  {failedRows.map((r, idx) => (
                    <div key={idx} className="py-0.5">
                      Row {r.row_number}: <span className="text-muted-foreground">{r.message ?? r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
