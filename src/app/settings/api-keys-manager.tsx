"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createApiKeyAction, deleteApiKeyAction } from "./api-keys-actions";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function ApiKeysManager({ keys }: { keys: ApiKeyRow[] }) {
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createApiKeyAction(name);
        setRevealedKey(result.rawKey);
        setCopied(false);
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create API key.");
      }
    });
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {revealedKey && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-accent p-4 text-sm">
          <p className="font-medium text-accent-foreground">
            Copy this key now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-background px-2.5 py-1.5 font-mono text-xs">
              {revealedKey}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiKeyName">New key name</Label>
          <Input
            id="apiKeyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CLI script"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((k) => (
            <TableRow key={k.id}>
              <TableCell>{k.name}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{k.keyPrefix}…</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(k.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
              </TableCell>
              <TableCell>
                <form action={deleteApiKeyAction}>
                  <input type="hidden" name="id" value={k.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Revoke API key "${k.name}"? Anything using it will stop working immediately.`}
                    size="sm"
                    variant="ghost"
                  >
                    Revoke
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {keys.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No API keys yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
