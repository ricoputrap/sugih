"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTransactionsPageStore } from "@/modules/Transaction/stores";
import {
  useTransactionReferenceData,
  type Transaction,
} from "@/modules/Transaction/hooks";
import { transactionKeys } from "@/modules/Transaction/utils/queryKeys";

interface Posting {
  id: string;
  event_id: string;
  wallet_id: string | null;
  savings_bucket_id: string | null;
  amount_idr: number;
  created_at: string | Date;
}

const typeLabels: Record<Transaction["type"], string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  savings_contribution: "Savings Contribution",
  savings_withdrawal: "Savings Withdrawal",
};

const typeColors: Record<Transaction["type"], string> = {
  expense: "destructive",
  income: "default",
  transfer: "secondary",
  savings_contribution: "outline",
  savings_withdrawal: "outline",
};

// Schema for expense updates
const expenseUpdateSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().min(1, "Category is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional().nullable(),
});

// Schema for income updates
const incomeUpdateSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().optional().nullable(),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional().nullable(),
  payee: z.string().optional().nullable(),
});

// Schema for transfer updates
const transferUpdateSchema = z.object({
  occurredAt: z.date(),
  fromWalletId: z.string().min(1, "From wallet is required"),
  toWalletId: z.string().min(1, "To wallet is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional().nullable(),
});

// Schema for savings contribution updates
const savingsContributeUpdateSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  bucketId: z.string().min(1, "Savings bucket is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional().nullable(),
});

// Schema for savings withdrawal updates
const savingsWithdrawUpdateSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  bucketId: z.string().min(1, "Savings bucket is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional().nullable(),
});

export function EditTransactionDialog() {
  const { isEditDialogOpen, transactionToEdit, closeEditDialog } =
    useTransactionsPageStore();
  const { data: referenceData } = useTransactionReferenceData();
  const queryClient = useQueryClient();

  const transaction = transactionToEdit;
  const wallets = referenceData?.wallets ?? [];
  const categories = referenceData?.categories ?? [];
  const savingsBuckets = referenceData?.savingsBuckets ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");

  // Filter categories by type
  const expenseCategories = categories.filter((cat) => cat.type === "expense");
  const incomeCategories = categories.filter((cat) => cat.type === "income");

  // Currency formatting utilities
  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
    if (numValue === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[Rp\s.,]/g, "");
    return parseInt(cleaned) || 0;
  };

  // Get the appropriate schema for the transaction type
  const getSchema = () => {
    if (!transaction) return expenseUpdateSchema;
    switch (transaction.type) {
      case "expense":
        return expenseUpdateSchema;
      case "income":
        return incomeUpdateSchema;
      case "transfer":
        return transferUpdateSchema;
      case "savings_contribution":
        return savingsContributeUpdateSchema;
      case "savings_withdrawal":
        return savingsWithdrawUpdateSchema;
      default:
        return expenseUpdateSchema;
    }
  };

  // Get default values based on transaction type
  const getDefaultValues = () => {
    if (!transaction) {
      return {
        occurredAt: new Date(),
        walletId: "",
        categoryId: "",
        amountIdr: 0,
        note: "",
      };
    }

    const baseValues = {
      occurredAt: new Date(transaction.occurred_at),
      note: transaction.note || "",
    };

    switch (transaction.type) {
      case "expense": {
        const walletPosting = transaction.postings.find((p) => p.wallet_id);
        return {
          ...baseValues,
          walletId: walletPosting?.wallet_id || "",
          categoryId: transaction.category_id || "",
          amountIdr: transaction.display_amount_idr,
        };
      }
      case "income": {
        const walletPosting = transaction.postings.find((p) => p.wallet_id);
        return {
          ...baseValues,
          walletId: walletPosting?.wallet_id || "",
          categoryId: transaction.category_id || "",
          amountIdr: transaction.display_amount_idr,
          payee: transaction.payee || "",
        };
      }
      case "transfer": {
        const fromPosting = transaction.postings.find(
          (p) => Number(p.amount_idr) < 0,
        );
        const toPosting = transaction.postings.find(
          (p) => Number(p.amount_idr) > 0,
        );
        return {
          ...baseValues,
          fromWalletId: fromPosting?.wallet_id || "",
          toWalletId: toPosting?.wallet_id || "",
          amountIdr: transaction.display_amount_idr,
        };
      }
      case "savings_contribution":
      case "savings_withdrawal": {
        const walletPosting = transaction.postings.find((p) => p.wallet_id);
        const bucketPosting = transaction.postings.find(
          (p) => p.savings_bucket_id,
        );
        return {
          ...baseValues,
          walletId: walletPosting?.wallet_id || "",
          bucketId: bucketPosting?.savings_bucket_id || "",
          amountIdr: transaction.display_amount_idr,
        };
      }
      default:
        return {
          ...baseValues,
          walletId: "",
          categoryId: "",
          amountIdr: 0,
        };
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getDefaultValues(),
  });

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && open) {
      form.reset(getDefaultValues());
      setAmountDisplay("");
    }
  }, [transaction, open]);

  const handleSubmit = async (data: any) => {
    if (!transaction) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        occurredAt: data.occurredAt.toISOString(),
      };

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update transaction");
      }

      toast.success("Transaction updated successfully");
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      closeEditDialog();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast.error(error.message || "Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={closeEditDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Transaction
            <Badge variant={typeColors[transaction.type] as any}>
              {typeLabels[transaction.type]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Update the transaction details. Transaction type cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Date Field - Common to all types */}
            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expense Fields */}
            {transaction.type === "expense" && (
              <>
                <FormField
                  control={form.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Income Fields */}
            {transaction.type === "income" && (
              <>
                <FormField
                  control={form.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (optional)</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "__none__" ? null : value)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No category</SelectItem>
                          {incomeCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payee (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter payee name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Transfer Fields */}
            {transaction.type === "transfer" && (
              <>
                <FormField
                  control={form.control}
                  name="fromWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Savings Contribution/Withdrawal Fields */}
            {(transaction.type === "savings_contribution" ||
              transaction.type === "savings_withdrawal") && (
              <>
                <FormField
                  control={form.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bucketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Savings Bucket</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select savings bucket" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {savingsBuckets.map((bucket) => (
                            <SelectItem key={bucket.id} value={bucket.id}>
                              {bucket.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Amount Field - Common to all types */}
            <FormField
              control={form.control}
              name="amountIdr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (IDR)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Rp 50.000"
                      value={
                        amountDisplay || formatCurrency(field.value as number)
                      }
                      onChange={(e) => {
                        const display = e.target.value;
                        setAmountDisplay(display);
                        const numeric = parseCurrency(display);
                        field.onChange(numeric);
                      }}
                      onBlur={() => {
                        setAmountDisplay("");
                        field.onBlur();
                      }}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note Field - Common to all types */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeEditDialog()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
