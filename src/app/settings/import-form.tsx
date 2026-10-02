"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CsvImportResult } from "./actions";

type Phase = "idle" | "previewing" | "previewed" | "committing" | "committed";

/** Validate-then-confirm CSV import, shared by the Items and Tasks CSVs. */
export function ImportForm({
  fileLabel,
  inputId,
  previewAction,
  commitAction,
}: {
  fileLabel: string;
  inputId: string;
  previewAction: (csvText: string) => Promise<CsvImportResult>;
  commitAction: (csvText: string) => Promise<CsvImportResult>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(null);
    setPhase("idle");
    if (!file) {
      setCsvText(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handlePreview() {
    if (!csvText) return;
    setPhase("previewing");
    startTransition(async () => {
      const result = await previewAction(csvText);
      setPreview(result);
      setPhase("previewed");
    });
  }

  function handleConfirm() {
    if (!csvText) return;
    setPhase("committing");
    startTransition(async () => {
      const result = await commitAction(csvText);
      setPreview(result);
      setPhase("committed");
    });
  }

  function reset() {
    setCsvText(null);
    setFileName(null);
    setPreview(null);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasErrors = (preview?.errors.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{fileLabel}</Label>
        <Input id={inputId} type="file" accept=".csv,text/csv" ref={fileInputRef} onChange={handleFileChange} />
      </div>

      {csvText && phase !== "committed" && (
        <div className="flex gap-3">
          <Button type="button" onClick={handlePreview} disabled={isPending}>
            Validate {fileName}
          </Button>
          {preview && !hasErrors && (
            <Button type="button" variant="secondary" onClick={handleConfirm} disabled={isPending}>
              Confirm import
            </Button>
          )}
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-2 text-sm">
          {hasErrors ? (
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">
                {preview.errors.length} issue{preview.errors.length === 1 ? "" : "s"} found — fix and re-upload.
              </p>
              <ul className="list-inside list-disc text-muted-foreground">
                {preview.errors.slice(0, 25).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
              {preview.errors.length > 25 && (
                <p className="text-muted-foreground">…and {preview.errors.length - 25} more.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-muted-foreground">
              <p className="font-medium text-foreground">
                {phase === "committed" ? "Import complete." : "Valid — ready to import."}
              </p>
              {preview.summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "committed" && (
        <Button type="button" variant="outline" onClick={reset} className="w-fit">
          Import another file
        </Button>
      )}
    </div>
  );
}
