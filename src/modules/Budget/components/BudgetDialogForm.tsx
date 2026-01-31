"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BudgetUpsertSchema } from "../schema";
import { toast } from "sonner";
import { Wallet, PiggyBank } from "lucide-react";
import { useBudgetMonth, useBudgetMutations } from "@/modules/Budget/hooks";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  archived: boolean;
}

interface SavingsBucket {
  id: string;
  name: string;
  description?: string | null;
  archived: boolean;
}

// Form schema that handles both category and savings bucket targets
const BudgetFormSchema = z
  .object({
    month: BudgetUpsertSchema.shape.month,
    targetType: z.enum(["category", "savings_bucket"]),
    categoryId: z.string().optional().nullable(),
    savingsBucketId: z.string().optional().nullable(),
    amountIdr: z.number().int().positive("Budget amount must be positive"),
    note: z
      .string()
      .max(500, "Note must be 500 characters or less")
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.targetType === "category") {
        return data.categoryId != null && data.categoryId !== "";
      } else {
        return data.savingsBucketId != null && data.savingsBucketId !== "";
      }
    },
    {
      message: "Please select a target",
      path: ["categoryId"],
    },
  );

type BudgetFormValues = z.infer<typeof BudgetFormSchema>;

export function BudgetDialogForm() {
  // Extract state from store
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    selectedBudget,
    closeCreateDialog,
    closeEditDialog,
  } = useBudgetsPageStore();

  // Get current month from URL
  const [month] = useBudgetMonth();

  // Get mutations
  const { createBudget, updateBudget } = useBudgetMutations();

  // Determine mode and open state
  const isOpen = isCreateDialogOpen || isEditDialogOpen;
  const mode = isEditDialogOpen && selectedBudget ? "edit" : "create";
  const isEditing = mode === "edit" && !!selectedBudget;
  const initialData = isEditing ? selectedBudget : null;
  const isLoading = createBudget.isPending || updateBudget.isPending;
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsBuckets, setSavingsBuckets] = useState<SavingsBucket[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [bucketsLoading, setBucketsLoading] = useState(false);

  // Get current month in YYYY-MM-01 format for the input
  const getCurrentMonthFirst = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  // Determine initial target type
  const getInitialTargetType = (): "category" | "savings_bucket" => {
    if (initialData?.savings_bucket_id) return "savings_bucket";
    return "category";
  };

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(BudgetFormSchema),
    defaultValues: {
      month: initialData?.month || getCurrentMonthFirst(),
      targetType: getInitialTargetType(),
      categoryId: initialData?.category_id || "",
      savingsBucketId: initialData?.savings_bucket_id || "",
      amountIdr: initialData?.amount_idr || 0,
      note: initialData?.note || "",
    },
  });

  const targetType = form.watch("targetType");

  // Fetch categories when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSavingsBuckets();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/categories");

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      // Filter to show only active expense categories
      const expenseCategories = data.filter(
        (cat: Category) => !cat.archived && cat.type === "expense",
      );
      setCategories(expenseCategories);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load categories";
      toast.error(errorMessage);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSavingsBuckets = async () => {
    try {
      setBucketsLoading(true);
      const response = await fetch("/api/savings-buckets");

      if (!response.ok) {
        throw new Error("Failed to fetch savings buckets");
      }

      const data = await response.json();
      // Filter to show only active savings buckets
      const activeBuckets = data.filter(
        (bucket: SavingsBucket) => !bucket.archived,
      );
      setSavingsBuckets(activeBuckets);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load savings buckets";
      toast.error(errorMessage);
    } finally {
      setBucketsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        month: initialData?.month || getCurrentMonthFirst(),
        targetType: getInitialTargetType(),
        categoryId: initialData?.category_id || "",
        savingsBucketId: initialData?.savings_bucket_id || "",
        amountIdr: initialData?.amount_idr || 0,
        note: initialData?.note || "",
      });
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async (values: BudgetFormValues) => {
    try {
      // Convert empty string to null for note field
      const submitValues = {
        month: values.month,
        categoryId: values.targetType === "category" ? values.categoryId : null,
        savingsBucketId:
          values.targetType === "savings_bucket"
            ? values.savingsBucketId
            : null,
        amountIdr: values.amountIdr,
        note: values.note && values.note.trim() !== "" ? values.note : null,
      };

      if (isEditing && selectedBudget) {
        await updateBudget.mutateAsync({
          id: selectedBudget.id,
          month,
          amountIdr: submitValues.amountIdr,
          note: submitValues.note,
        });
      } else {
        await createBudget.mutateAsync({
          month: submitValues.month,
          categoryId: submitValues.categoryId,
          savingsBucketId: submitValues.savingsBucketId,
          amountIdr: submitValues.amountIdr,
          note: submitValues.note,
        });
      }

      form.reset();
      handleOpenChange(false);
      toast.success(`Budget ${isEditing ? "updated" : "created"} successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "create"} budget`;
      toast.error(errorMessage);
      throw error;
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
  const dataLoading = categoriesLoading || bucketsLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the budget amount for this category or savings bucket."
              : "Set a monthly budget for a category or savings bucket to track your spending and savings goals."}
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
                    value={field.value || getCurrentMonthFirst()}
                    onValueChange={field.onChange}
                    disabled={isEditing || dataLoading}
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

            {/* Target Type Selection (only for create mode) */}
            {mode === "create" && (
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Budget For</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                        disabled={dataLoading}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="category"
                            id="target-category"
                          />
                          <Label
                            htmlFor="target-category"
                            className="flex items-center gap-1.5 cursor-pointer"
                          >
                            <Wallet className="h-4 w-4" />
                            Expense Category
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="savings_bucket"
                            id="target-savings"
                          />
                          <Label
                            htmlFor="target-savings"
                            className="flex items-center gap-1.5 cursor-pointer"
                          >
                            <PiggyBank className="h-4 w-4" />
                            Savings Bucket
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category Selection (for create mode when category is selected) */}
            {mode === "create" && targetType === "category" && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="budget-form-category">
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
                            No active expense categories found
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

            {/* Savings Bucket Selection (for create mode when savings bucket is selected) */}
            {mode === "create" && targetType === "savings_bucket" && (
              <FormField
                control={form.control}
                name="savingsBucketId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Savings Bucket</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={bucketsLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="budget-form-savings-bucket">
                          <SelectValue placeholder="Select a savings bucket" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bucketsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading savings buckets...
                          </SelectItem>
                        ) : savingsBuckets.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No active savings buckets found
                          </SelectItem>
                        ) : (
                          savingsBuckets.map((bucket) => (
                            <SelectItem key={bucket.id} value={bucket.id}>
                              {bucket.name}
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

            {/* Target Display (for edit mode) */}
            {isEditing && initialData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {initialData.target_type === "savings_bucket"
                    ? "Savings Bucket"
                    : "Category"}
                </label>
                <div className="px-3 py-2 text-sm border rounded-md bg-muted flex items-center gap-2">
                  {initialData.target_type === "savings_bucket" ? (
                    <>
                      <PiggyBank className="h-4 w-4 text-muted-foreground" />
                      {initialData.savings_bucket_name ||
                        "Unknown Savings Bucket"}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      {initialData.category_name || "Unknown Category"}
                    </>
                  )}
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
                      data-testid="budget-form-amount"
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

            {/* Note Field */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note to describe this budget allocation..."
                      data-testid="budget-form-note"
                      className="resize-none"
                      rows={3}
                      maxLength={500}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      {(field.value || "").length}/500
                    </span>
                  </div>
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
              <Button type="submit" disabled={isLoading || dataLoading}>
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
