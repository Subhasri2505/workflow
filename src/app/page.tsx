"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Play, Trash2, ChevronLeft, ChevronRight, Activity } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isActive: boolean;
  steps: any[];
  _count?: { executions: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function WorkflowListPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);

  // Auto-seed database on first load if empty
  useEffect(() => {
    const autoSeed = async () => {
      try {
        const res = await fetch("/api/seed");
        const data = await res.json();
        if (!data.seeded && !seeded) {
          // Database is empty, seed it
          const seedRes = await fetch("/api/seed", { method: "POST" });
          if (seedRes.ok) {
            setSeeded(true);
          }
        }
      } catch {
        // Ignore errors
      }
    };
    autoSeed();
  }, [seeded]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const res = await fetch(`/api/workflows?${params}`);
      const json = await res.json();
      setWorkflows(json.data ?? []);
      setPagination(json.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};
    if (!newName.trim()) newErrors.newName = "Workflow name is required";
    else if (workflows.some((w) => w.name.toLowerCase() === newName.trim().toLowerCase())) {
      newErrors.newName = "Workflow name already exists";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCreating(true);
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      setShowCreate(false);
      fetchWorkflows();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow and all its data?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    fetchWorkflows();
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pagination.total} workflow{pagination.total !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> New Workflow
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200 h-10 shadow-sm"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                {["Name", "Steps", "Version", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase ${h === "Actions" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : workflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-slate-500">No workflows found. Create one to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                workflows.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors duration-200 bg-white group">
                    <td className="px-5 py-4 font-semibold text-slate-900">{w.name}</td>
                    <td className="px-5 py-4 text-slate-500">{w.steps?.length ?? 0}</td>
                    <td className="px-5 py-4 text-slate-500">v{w.version}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={w.isActive ? "completed" : "canceled"} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" asChild>
                          <Link href={`/workflows/${w.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50" asChild>
                          <Link href={`/workflows/${w.id}/execute`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(w.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * pagination.limit + 1}–
              {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) { setNewName(""); setErrors({}); } setShowCreate(v); }}>
        <DialogContent className="sm:max-w-[425px] sm:rounded-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Create Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800">Workflow Name <span className="text-red-500">*</span></Label>
              <Input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (errors.newName) setErrors({...errors, newName: ""}); }}
                placeholder="e.g. Expense Approval"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className={errors.newName ? "border-red-500 focus-visible:ring-red-500 shadow-sm" : "focus-visible:ring-blue-500 border-slate-300 shadow-sm"}
              />
              {errors.newName && <p className="text-xs text-red-500 font-medium">{errors.newName}</p>}
            </div>
          </div>
          <DialogFooter className="mt-2 text-right flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-200 text-slate-700 bg-white shadow-sm font-medium hover:bg-slate-50">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-blue-400 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors">
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
