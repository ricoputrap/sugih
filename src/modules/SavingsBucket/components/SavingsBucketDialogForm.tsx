"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SavingsBucketCreateSchema } from "../schema";
import { useSavingsPageStore } from "../stores";
import { useSavingsBucketMutations } from "../hooks";
import { toast } from "sonner";

const formSchema = SavingsBucketCreateSchema;

type FormValues = z.infer<typeof formSchema>;

export function SavingsBucketDialogForm() {
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    selectedBucket,
    closeCreateDialog,
    closeEditDialog,
  } = useSavingsPageStore();
  const { createBucket, updateBucket } = useSavingsBucketMutations();

  const isOpen = isCreateDialogOpen || isEditDialogOpen;
  const isEditing = isEditDialogOpen && !!selectedBucket;
  const isLoading = createBucket.isPending || updateBucket.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: selectedBucket?.name || "",
        description: selectedBucket?.description || "",
      });
    }
  }, [isOpen, selectedBucket, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (isEditing && selectedBucket) {
        await updateBucket.mutateAsync({
          id: selectedBucket.id,
          name: values.name,
          description: values.description,
        });
        toast.success("Savings bucket updated successfully");
      } else {
        await createBucket.mutateAsync(values);
        toast.success("Savings bucket created successfully");
      }
      form.reset();
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.message ||
          `Failed to ${isEditing ? "update" : "create"} savings bucket`,
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      if (isEditDialogOpen) {
        closeEditDialog();
      } else {
        closeCreateDialog();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Savings Bucket" : "Create New Savings Bucket"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the savings bucket."
              : "Add a new savings bucket to allocate funds for specific goals."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Emergency Fund"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 6 months of living expenses for emergencies"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Bucket"
                    : "Create Bucket"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
