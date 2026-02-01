"use client";

import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Archive,
  Trash2,
  ArchiveRestore,
  Pencil,
} from "lucide-react";
import { SavingsBucket } from "../schema";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";

interface SavingsBucketTableProps {
  buckets: SavingsBucket[];
  onArchive?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (bucket: SavingsBucket) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  isLoading?: boolean;
}

export function SavingsBucketTable({
  buckets,
  onArchive,
  onDelete,
  onEdit,
  onBulkDelete,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  isLoading = false,
}: SavingsBucketTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  // Use external selection state if provided, otherwise use internal
  const selectedIds = externalSelectedIds || internalSelectedIds;
  const setSelectedIds = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!onArchive) return;

    try {
      setActionLoading(id);
      await onArchive(id);
      toast.success(`Savings bucket "${name}" archived successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to archive savings bucket");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!onDelete) return;

    if (
      !confirm(
        `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setActionLoading(id);
      await onDelete(id);
      toast.success(`Savings bucket "${name}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete savings bucket");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (bucket: SavingsBucket) => {
    if (onEdit) {
      onEdit(bucket);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";

    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Bridge selectedIds string[] <-> RowSelectionState
  const rowSelection = useMemo(() => {
    const state: RowSelectionState = {};
    for (const id of selectedIds) {
      state[id] = true;
    }
    return state;
  }, [selectedIds]);

  const handleRowSelectionChange = (newState: RowSelectionState) => {
    const newIds = Object.keys(newState).filter(k => newState[k]);
    setSelectedIds(newIds);
  };

  const columns: ColumnDef<SavingsBucket>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <button
          onClick={() => table.toggleAllPageRowsSelected()}
          className="flex items-center justify-center"
          title="Select all"
        >
          <input
            type="checkbox"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            className="cursor-pointer"
            aria-label="Select all savings buckets"
          />
        </button>
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          className="cursor-pointer"
          aria-label={`Select ${row.original.name}`}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {(row.getValue("description") as string) || "—"}
        </span>
      ),
    },
    {
      accessorKey: "archived",
      header: "Status",
      cell: ({ row }) => {
        const archived = row.getValue("archived") as boolean;
        return archived ? (
          <Badge variant="secondary">Archived</Badge>
        ) : (
          <Badge variant="default">Active</Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bucket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={actionLoading === bucket.id}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!bucket.archived ? (
                <>
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={() => handleEdit(bucket)}
                      disabled={actionLoading === bucket.id}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onArchive && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleArchive(bucket.id, bucket.name)
                      }
                      disabled={actionLoading === bucket.id}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  {onArchive && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleArchive(bucket.id, bucket.name)
                      }
                      disabled={actionLoading === bucket.id}
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => handleDelete(bucket.id, bucket.name)}
                  className="text-red-600"
                  disabled={
                    actionLoading === bucket.id || !bucket.archived
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-gray-200"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No savings buckets found. Create your first bucket to get started.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={buckets}
      rowSelection={rowSelection}
      onRowSelectionChange={handleRowSelectionChange}
      getRowId={(row) => row.id}
      searchKey="name"
      searchPlaceholder="Search buckets..."
    />
  );
}
