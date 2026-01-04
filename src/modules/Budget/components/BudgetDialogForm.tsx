"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BudgetUpsertSchema,
  BudgetItemSchema,
  BudgetWithCategory,
} from "../schema";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  archived: boolean;
}

interface BudgetDialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    month: string;
    categoryId: string;
    amountIdr: number;
  }) => Promise<void>;
  isLoading?: boolean;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    month: string;
    category_id: string;
    category_name?: string;
    amount_idr: number;
  } | null;
}

export function BudgetDialogForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  mode,
  initialData,
}: BudgetDialogFormProps) {
  const isEditing = mode === "edit" && !!initialData;
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const form = useForm<{
    month: string;
    categoryId: string;
    amountIdr: number;
  }>({
    resolver: zodResolver(
      BudgetItemSchema.extend({
        month: BudgetUpsertSchema.shape.month,
      }),
    ),
    defaultValues: {
      month: initialData?.month || "",
      categoryId: initialData?.category_id || "",
      amountIdr: initialData?.amount_idr || 0,
    },
  });

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/categories");

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      // Filter out archived categories
      const activeCategories = data.filter((cat: Category) => !cat.archived);
      setCategories(activeCategories);
    } catch (error: any) {
      toast.error(error.message || "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      form.reset({
        month: initialData?.month || "",
        categoryId: initialData?.category_id || "",
        amountIdr: initialData?.amount_idr || 0,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = async (values: {
    month: string;
    categoryId: string;
    amountIdr: number;
  }) => {
    try {
      await onSubmit(values);
      form.reset();
      onOpenChange(false);
      toast.success(
        `Budget ${isEditing ? "updated" : "created"} successfully`,
      );
    } catch (error: any) {
      toast.error(
        error.message || `Failed to ${isEditing ? "update" : "create"} budget`,
      );
      throw error;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Get current month in YYYY-MM-01 format for the input
  const getCurrentMonthFirst = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  // Generate month options (current month + 11 previous + 6 next)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate 18 months total (6 previous, current, 11 next)
    for (let i = -6; i <= 11; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const monthFirst = `${year}-${month}-01`;
      const monthDisplay = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      options.push({
        value: monthFirst,
        label: monthDisplay,
      });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the budget amount for this category."
              : "Set a monthly budget for a category to track your spending."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Month Selection */}
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || getCurrentMonthFirst()}
                    disabled={isEditing || categoriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Selection (only for create mode or if not editing) */}
            {mode === "create" && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading categories...
                          </SelectItem>
                        ) : categories.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No active categories found
                          </SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category Display (for edit mode) */}
            {isEditing && initialData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="px-3 py-2 text-sm border rounded-md bg-muted">
                  {initialData.category_name || "Unknown Category"}
                </div>
              </div>
            )}

            {/* Budget Amount */}
            <FormField
              control={form.control}
              name="amountIdr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount (IDR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
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
              <Button type="submit" disabled={isLoading || categoriesLoading}>
                {isLoading
                  ? "Saving..."
                  : isEditing
                  ? "Update Budget"
                  : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
