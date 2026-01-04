"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface SavingsBucketTableProps {
  buckets: SavingsBucket[];
  onArchive?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (bucket: SavingsBucket) => void;
  isLoading?: boolean;
}

export function SavingsBucketTable({
  buckets,
  onArchive,
  onDelete,
  onEdit,
  isLoading = false,
}: SavingsBucketTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </TableCell>
                <TableCell className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </TableCell>
                <TableCell className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </TableCell>
                <TableCell className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[300px]">Description</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[150px]">Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                No savings buckets found. Create your first bucket to get started.
              </TableCell>
            </TableRow>
          ) : (
            buckets.map((bucket) => (
              <TableRow key={bucket.id}>
                <TableCell className="font-medium">{bucket.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {bucket.description || "—"}
                </TableCell>
                <TableCell>
                  {bucket.archived ? (
                    <Badge variant="secondary">Archived</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(bucket.created_at)}
                </TableCell>
                <TableCell>
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
                          onClick={() =>
                            handleDelete(bucket.id, bucket.name)
                          }
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
