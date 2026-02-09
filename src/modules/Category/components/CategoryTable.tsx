"use client";

import { useState } from "react";
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
import { Category } from "../schema";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface CategoryTableProps {
  categories: Category[];
  onArchive?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (category: Category) => void;
  isLoading?: boolean;
}

export function CategoryTable({
  categories,
  onArchive,
  onDelete,
  onEdit,
  isLoading = false,
}: CategoryTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleArchive = async (id: string, name: string) => {
    if (!onArchive) return;

    try {
      setActionLoading(id);
      await onArchive(id);
      toast.success(`Category "${name}" archived successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to archive category");
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
      toast.success(`Category "${name}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (category: Category) => {
    if (onEdit) {
      onEdit(category);
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

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return type === "income" ? (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Income
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Expense
          </Badge>
        );
      },
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
        const category = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={actionLoading === category.id}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!category.archived ? (
                <>
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={() => handleEdit(category)}
                      disabled={actionLoading === category.id}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onArchive && (
                    <DropdownMenuItem
                      onClick={() => handleArchive(category.id, category.name)}
                      disabled={actionLoading === category.id}
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
                      onClick={() => handleArchive(category.id, category.name)}
                      disabled={actionLoading === category.id}
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
                  onClick={() => handleDelete(category.id, category.name)}
                  className="text-red-600"
                  disabled={actionLoading === category.id || !category.archived}
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No categories found. Create your first category to get started.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={categories}
      searchKey="name"
      searchPlaceholder="Search categories..."
    />
  );
}
