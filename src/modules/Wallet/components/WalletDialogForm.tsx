"use client";

import { useEffect } from "react";
import { WalletCreateInput, WalletUpdateInput } from "@/modules/Wallet/schema";
import { useWalletsPageStore } from "@/modules/Wallet/stores";
import { useWalletMutations } from "@/modules/Wallet/hooks";
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

export function WalletDialogForm() {
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    selectedWallet,
    closeCreateDialog,
    closeEditDialog,
  } = useWalletsPageStore();
  const { createWallet, updateWallet } = useWalletMutations();

  const isOpen = isCreateDialogOpen || isEditDialogOpen;
  const isEditing = isEditDialogOpen && !!selectedWallet;
  const isLoading = createWallet.isPending || updateWallet.isPending;

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
    if (isOpen) {
      if (isEditing && selectedWallet) {
        form.reset({
          name: selectedWallet.name,
          type: selectedWallet.type,
          currency: selectedWallet.currency,
        });
      } else {
        form.reset({
          name: "",
          type: "bank",
          currency: "IDR",
        });
      }
    }
  }, [isOpen, isEditing, selectedWallet, form]);

  const onSubmit = async (data: WalletCreateInput | WalletUpdateInput) => {
    try {
      if (isEditing && selectedWallet) {
        await updateWallet.mutateAsync({
          id: selectedWallet.id,
          ...(data as WalletUpdateInput),
        });
        toast.success(`Wallet "${selectedWallet.name}" updated successfully`);
      } else {
        const result = await createWallet.mutateAsync(
          data as WalletCreateInput,
        );
        toast.success(`Wallet "${result.name}" created successfully`);
      }

      form.reset();
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save wallet");
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
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
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
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
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
