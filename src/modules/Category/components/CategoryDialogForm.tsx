"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { CategoryCreateSchema, CategoryType } from "../schema";
import { useCategoriesPageStore } from "../stores";
import { useCategoryMutations } from "../hooks";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function CategoryDialogForm() {
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    selectedCategory,
    closeCreateDialog,
    closeEditDialog,
  } = useCategoriesPageStore();
  const { createCategory, updateCategory } = useCategoryMutations();

  const isOpen = isCreateDialogOpen || isEditDialogOpen;
  const isEditing = isEditDialogOpen && !!selectedCategory;
  const isLoading = createCategory.isPending || updateCategory.isPending;

  const form = useForm<{ name: string; type: CategoryType }>({
    resolver: zodResolver(CategoryCreateSchema),
    defaultValues: {
      name: "",
      type: "expense",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: selectedCategory?.name || "",
        type: selectedCategory?.type || "expense",
      });
    }
  }, [isOpen, selectedCategory, form]);

  const handleSubmit = async (values: { name: string; type: CategoryType }) => {
    try {
      if (isEditing && selectedCategory) {
        await updateCategory.mutateAsync({
          id: selectedCategory.id,
          name: values.name,
          type: values.type,
        });
        toast.success("Category updated successfully");
      } else {
        await createCategory.mutateAsync(values);
        toast.success("Category created successfully");
      }
      form.reset();
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.message ||
          `Failed to ${isEditing ? "update" : "create"} category`,
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
            {isEditing ? "Edit Category" : "Create New Category"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the category details."
              : "Add a new category to organize your transactions."}
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
                      placeholder="e.g., Food & Dining"
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
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Category Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                      disabled={isLoading}
                    >
                      <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="expense" id="expense" />
                        <Label
                          htmlFor="expense"
                          className="font-normal cursor-pointer"
                        >
                          <div className="font-medium">Expense</div>
                          <div className="text-sm text-muted-foreground">
                            For spending and costs (can be budgeted)
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="income" id="income" />
                        <Label
                          htmlFor="income"
                          className="font-normal cursor-pointer"
                        >
                          <div className="font-medium">Income</div>
                          <div className="text-sm text-muted-foreground">
                            For earnings and revenue (cannot be budgeted)
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
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
                    ? "Update Category"
                    : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
