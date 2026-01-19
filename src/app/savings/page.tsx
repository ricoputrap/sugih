"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SavingsBucketTable } from "@/modules/SavingsBucket/components/SavingsBucketTable";
import { SavingsBucketDialogForm } from "@/modules/SavingsBucket/components/SavingsBucketDialogForm";
import { SavingsBucket } from "@/modules/SavingsBucket/schema";
import { toast } from "sonner";

export default function SavingsPage() {
  const [buckets, setBuckets] = useState<SavingsBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<SavingsBucket | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch savings buckets
  const fetchBuckets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/savings-buckets");

      if (!response.ok) {
        throw new Error("Failed to fetch savings buckets");
      }

      const data = await response.json();
      setBuckets(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load savings buckets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  // Handle create savings bucket
  const handleCreateBucket = async (values: {
    name: string;
    description?: string;
  }) => {
    try {
      const response = await fetch("/api/savings-buckets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create savings bucket");
      }

      await fetchBuckets();
    } catch (error: any) {
      throw error;
    }
  };

  // Handle update savings bucket
  const handleUpdateBucket = async (values: {
    name: string;
    description?: string;
  }) => {
    if (!selectedBucket) return;

    try {
      const response = await fetch(
        `/api/savings-buckets/${selectedBucket.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update savings bucket");
      }

      await fetchBuckets();
      setSelectedBucket(null);
    } catch (error: any) {
      throw error;
    }
  };

  // Handle archive savings bucket
  const handleArchiveBucket = async (id: string) => {
    const response = await fetch(`/api/savings-buckets/${id}?action=archive`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive savings bucket");
    }

    await fetchBuckets();
  };

  // Handle delete savings bucket
  const handleDeleteBucket = async (id: string) => {
    const response = await fetch(`/api/savings-buckets/${id}?action=delete`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete savings bucket");
    }

    await fetchBuckets();
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/savings-buckets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle partial failure
        if (errorData.error?.issues?.details?.failedIds) {
          const { deletedCount, failedIds } = errorData.error.issues.details;
          toast.error(
            `${deletedCount} bucket(s) deleted, but ${failedIds.length} failed. Failed IDs: ${failedIds.join(", ")}`,
          );
          setSelectedBucketIds(failedIds); // Keep failed IDs selected
        } else {
          throw new Error(
            errorData.error?.message || "Failed to delete savings buckets",
          );
        }
      } else {
        const data = await response.json();
        toast.success(
          `${data.deletedCount} savings bucket(s) deleted successfully`,
        );
        setSelectedBucketIds([]); // Clear selection on success
      }

      await fetchBuckets();
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete savings buckets");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit dialog
  const handleEditClick = (bucket: SavingsBucket) => {
    setSelectedBucket(bucket);
    setIsEditDialogOpen(true);
  };

  // Count active and archived buckets
  const activeBuckets = buckets.filter((b) => !b.archived);
  const archivedBuckets = buckets.filter((b) => b.archived);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings Buckets</h1>
          <p className="text-muted-foreground">
            Manage your savings goals and allocate funds for specific purposes
          </p>
        </div>
        <div className="flex gap-2">
          {selectedBucketIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedBucketIds.length})
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bucket
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBuckets.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for contributions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Archived Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedBuckets.length}</div>
            <p className="text-xs text-muted-foreground">Hidden from forms</p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Buckets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Savings Buckets</CardTitle>
          <CardDescription>
            A list of all your savings buckets for goal-based saving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SavingsBucketTable
            buckets={buckets}
            onArchive={handleArchiveBucket}
            onDelete={handleDeleteBucket}
            onEdit={handleEditClick}
            onBulkDelete={handleBulkDelete}
            selectedIds={selectedBucketIds}
            onSelectionChange={setSelectedBucketIds}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete savings buckets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedBucketIds.length} savings bucket(s) to
              trash (soft delete). You can restore them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete(selectedBucketIds)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <SavingsBucketDialogForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateBucket}
        isLoading={isLoading}
        mode="create"
      />

      {/* Edit Dialog */}
      {selectedBucket && (
        <SavingsBucketDialogForm
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedBucket(null);
            }
          }}
          initialData={selectedBucket}
          onSubmit={handleUpdateBucket}
          isLoading={isLoading}
          mode="edit"
        />
      )}
    </div>
  );
}
