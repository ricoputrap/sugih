"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      const response = await fetch(`/api/savings-buckets/${selectedBucket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

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
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bucket
        </Button>
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
            <div className="text-2xl font-bold">
              {archivedBuckets.length}
            </div>
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
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

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
