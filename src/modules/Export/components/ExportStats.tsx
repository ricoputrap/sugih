"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Tags,
  PiggyBank,
  Receipt,
  FileText,
  PieChart,
} from "lucide-react";
import { useExportStats } from "../hooks";

export interface ExportStatsData {
  wallets: number;
  categories: number;
  savingsBuckets: number;
  transactions: number;
  postings: number;
  budgets: number;
}

export function ExportStats() {
  const { data: stats, isLoading } = useExportStats();

  const statItems = [
    {
      label: "Wallets",
      value: stats?.wallets ?? 0,
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Categories",
      value: stats?.categories ?? 0,
      icon: Tags,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      label: "Savings Buckets",
      value: stats?.savingsBuckets ?? 0,
      icon: PiggyBank,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Transactions",
      value: stats?.transactions ?? 0,
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      label: "Postings",
      value: stats?.postings ?? 0,
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      label: "Budgets",
      value: stats?.budgets ?? 0,
      icon: PieChart,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <div className={`p-2 rounded-md ${item.bgColor}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
