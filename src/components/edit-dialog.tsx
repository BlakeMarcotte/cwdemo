"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "checkbox" | "select" | "multi-select" | "textarea";
  options?: string[];
  placeholder?: string;
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  values: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
}

export function EditDialog({
  open,
  onOpenChange,
  title,
  fields,
  values,
  onSave,
}: EditDialogProps) {
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) setForm({ ...values });
  }, [open, values]);

  function handleChange(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMultiToggle(key: string, option: string) {
    const current = (form[key] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    handleChange(key, updated);
  }

  function handleSubmit() {
    onSave(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={String(form[f.key] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.key])}
                    onChange={(e) => handleChange(f.key, e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {f.placeholder || "Yes"}
                </label>
              ) : f.type === "select" ? (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                >
                  <option value="">Select...</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "multi-select" ? (
                <div className="flex flex-wrap gap-1.5">
                  {f.options?.map((o) => {
                    const selected = ((form[f.key] as string[]) || []).includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => handleMultiToggle(f.key, o)}
                        className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              ) : f.type === "number" ? (
                <Input
                  type="number"
                  value={form[f.key] != null ? String(form[f.key]) : ""}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    handleChange(
                      f.key,
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  className="h-9 text-sm"
                />
              ) : f.type === "date" ? (
                <Input
                  type="date"
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="h-9 text-sm"
                />
              ) : (
                <Input
                  type="text"
                  value={String(form[f.key] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="h-9 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
