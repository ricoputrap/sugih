"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  WalletCreateInput,
  WalletUpdateInput,
} from "@/modules/Wallet/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WalletCreateSchema,
  WalletUpdateSchema,
} from "@/modules/Wallet/schema";
import { toast } from "sonner";

interface WalletDialogFormProps {
  wallet?: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WalletDialogForm({
  wallet,
  open,
  onOpenChange,
  onSuccess,
}: WalletDialogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!wallet;

  const form = useForm<WalletCreateInput | WalletUpdateInput>({
    resolver: zodResolver(isEditing ? WalletUpdateSchema : WalletCreateSchema),
    defaultValues: {
      name: "",
      type: "bank",
      currency: "IDR",
    },
  });

  // Reset form when dialog opens/closes or wallet changes
  useEffect(() => {
    if (open) {
      if (isEditing && wallet) {
        form.reset({
          name: wallet.name,
          type: wallet.type,
          currency: wallet.currency,
        });
      } else {
        form.reset({
          name: "",
          type: "bank",
          currency: "IDR",
        });
      }
    }
  }, [open, isEditing, wallet, form]);

  const onSubmit = async (data: WalletCreateInput | WalletUpdateInput) => {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/wallets/${wallet!.id}` : "/api/wallets";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to save wallet");
      }

      const savedWallet = await response.json();

      toast.success(
        `Wallet "${savedWallet.name}" ${isEditing ? "updated" : "created"} successfully`,
      );

      onSuccess();
    } catch (error: any) {
      console.error("Error saving wallet:", error);
      toast.error(error.message || "Failed to save wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Wallet" : "Create New Wallet"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to your wallet details below."
              : "Add a new wallet to track your finances."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., BCA Savings, Cash, GoPay"
                      {...field}
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
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="ewallet">E-Wallet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IDR">
                        Indonesian Rupiah (IDR)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Wallet"
                    : "Create Wallet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
