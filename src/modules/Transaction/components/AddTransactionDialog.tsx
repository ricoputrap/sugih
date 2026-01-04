"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  wallets?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  savingsBuckets?: Array<{ id: string; name: string }>;
}

const expenseSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().min(1, "Category is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

const incomeSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
  payee: z.string().optional(),
});

const transferSchema = z.object({
  occurredAt: z.date(),
  fromWalletId: z.string().min(1, "From wallet is required"),
  toWalletId: z.string().min(1, "To wallet is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

const savingsContributeSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  bucketId: z.string().min(1, "Savings bucket is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

const savingsWithdrawSchema = z.object({
  occurredAt: z.date(),
  walletId: z.string().min(1, "Wallet is required"),
  bucketId: z.string().min(1, "Savings bucket is required"),
  amountIdr: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  wallets = [],
  categories = [],
  savingsBuckets = [],
}: AddTransactionDialogProps) {
  const [activeTab, setActiveTab] = useState("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Remove "Rp", spaces, dots (thousand separators), and commas
    const cleaned = value.replace(/[Rp\s.,]/g, "");
    return parseInt(cleaned) || 0;
  };

  const [expenseAmountDisplay, setExpenseAmountDisplay] = useState("");
  const [incomeAmountDisplay, setIncomeAmountDisplay] = useState("");
  const [transferAmountDisplay, setTransferAmountDisplay] = useState("");
  const [saveAmountDisplay, setSaveAmountDisplay] = useState("");
  const [withdrawAmountDisplay, setWithdrawAmountDisplay] = useState("");

  const expenseForm = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      occurredAt: new Date(),
      walletId: "",
      categoryId: "",
      amountIdr: 0,
      note: "",
    },
  });

  const incomeForm = useForm({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      occurredAt: new Date(),
      walletId: "",
      amountIdr: 0,
      note: "",
      payee: "",
    },
  });

  const transferForm = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      occurredAt: new Date(),
      fromWalletId: "",
      toWalletId: "",
      amountIdr: 0,
      note: "",
    },
  });

  const savingsContributeForm = useForm({
    resolver: zodResolver(savingsContributeSchema),
    defaultValues: {
      occurredAt: new Date(),
      walletId: "",
      bucketId: "",
      amountIdr: 0,
      note: "",
    },
  });

  const savingsWithdrawForm = useForm({
    resolver: zodResolver(savingsWithdrawSchema),
    defaultValues: {
      occurredAt: new Date(),
      walletId: "",
      bucketId: "",
      amountIdr: 0,
      note: "",
    },
  });

  const handleSubmit = async (type: string, data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        occurredAt: data.occurredAt.toISOString(),
      };

      const response = await fetch(`/api/transactions/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create transaction");
      }

      // Reset form
      switch (type) {
        case "expense":
          expenseForm.reset();
          break;
        case "income":
          incomeForm.reset();
          break;
        case "transfer":
          transferForm.reset();
          break;
        case "savings/contribute":
          savingsContributeForm.reset();
          break;
        case "savings/withdraw":
          savingsWithdrawForm.reset();
          break;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      alert(error.message || "Failed to create transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new financial transaction
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="save">Save</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>

          {/* Expense Tab */}
          <TabsContent value="expense">
            <Form {...expenseForm}>
              <form
                onSubmit={expenseForm.handleSubmit((data) =>
                  handleSubmit("expense", data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={expenseForm.control}
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

                <FormField
                  control={expenseForm.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={expenseForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
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
                  control={expenseForm.control}
                  name="amountIdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 50.000"
                          value={
                            expenseAmountDisplay ||
                            formatCurrency(field.value as number)
                          }
                          onChange={(e) => {
                            const display = e.target.value;
                            setExpenseAmountDisplay(display);
                            const numeric = parseCurrency(display);
                            field.onChange(numeric);
                          }}
                          onBlur={() => {
                            setExpenseAmountDisplay("");
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

                <FormField
                  control={expenseForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add a note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Expense"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income">
            <Form {...incomeForm}>
              <form
                onSubmit={incomeForm.handleSubmit((data) =>
                  handleSubmit("income", data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={incomeForm.control}
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

                <FormField
                  control={incomeForm.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={incomeForm.control}
                  name="amountIdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 5.000.000"
                          value={
                            incomeAmountDisplay ||
                            formatCurrency(field.value as number)
                          }
                          onChange={(e) => {
                            const display = e.target.value;
                            setIncomeAmountDisplay(display);
                            const numeric = parseCurrency(display);
                            field.onChange(numeric);
                          }}
                          onBlur={() => {
                            setIncomeAmountDisplay("");
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

                <FormField
                  control={incomeForm.control}
                  name="payee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payer/Source (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Employer, Client, Bank"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={incomeForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add a note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Income"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Form {...transferForm}>
              <form
                onSubmit={transferForm.handleSubmit((data) =>
                  handleSubmit("transfer", data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={transferForm.control}
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

                <FormField
                  control={transferForm.control}
                  name="fromWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={transferForm.control}
                  name="toWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

                <FormField
                  control={transferForm.control}
                  name="amountIdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 1.000.000"
                          value={
                            transferAmountDisplay ||
                            formatCurrency(field.value as number)
                          }
                          onChange={(e) => {
                            const display = e.target.value;
                            setTransferAmountDisplay(display);
                            const numeric = parseCurrency(display);
                            field.onChange(numeric);
                          }}
                          onBlur={() => {
                            setTransferAmountDisplay("");
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

                <FormField
                  control={transferForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add a note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Transfer"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Savings Contribute Tab */}
          <TabsContent value="save">
            <Form {...savingsContributeForm}>
              <form
                onSubmit={savingsContributeForm.handleSubmit((data) =>
                  handleSubmit("savings/contribute", data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={savingsContributeForm.control}
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

                <FormField
                  control={savingsContributeForm.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={savingsContributeForm.control}
                  name="bucketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Savings Bucket</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

                <FormField
                  control={savingsContributeForm.control}
                  name="amountIdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 500.000"
                          value={
                            saveAmountDisplay ||
                            formatCurrency(field.value as number)
                          }
                          onChange={(e) => {
                            const display = e.target.value;
                            setSaveAmountDisplay(display);
                            const numeric = parseCurrency(display);
                            field.onChange(numeric);
                          }}
                          onBlur={() => {
                            setSaveAmountDisplay("");
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

                <FormField
                  control={savingsContributeForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add a note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Save Money"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Savings Withdraw Tab */}
          <TabsContent value="withdraw">
            <Form {...savingsWithdrawForm}>
              <form
                onSubmit={savingsWithdrawForm.handleSubmit((data) =>
                  handleSubmit("savings/withdraw", data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={savingsWithdrawForm.control}
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

                <FormField
                  control={savingsWithdrawForm.control}
                  name="bucketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Savings Bucket</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

                <FormField
                  control={savingsWithdrawForm.control}
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Wallet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={savingsWithdrawForm.control}
                  name="amountIdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 500.000"
                          value={
                            withdrawAmountDisplay ||
                            formatCurrency(field.value as number)
                          }
                          onChange={(e) => {
                            const display = e.target.value;
                            setWithdrawAmountDisplay(display);
                            const numeric = parseCurrency(display);
                            field.onChange(numeric);
                          }}
                          onBlur={() => {
                            setWithdrawAmountDisplay("");
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

                <FormField
                  control={savingsWithdrawForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add a note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Withdraw Money"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
