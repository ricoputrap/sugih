import { NextRequest } from "next/server";
import { listWallets, createWallet } from "@/modules/Wallet/actions";
import { ok, created, badRequest, serverError } from "@/lib/http";

export async function GET() {
  try {
    const wallets = await listWallets();
    return ok(wallets);
  } catch (error: any) {
    console.error("Error fetching wallets:", error);
    return serverError("Failed to fetch wallets");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = await createWallet(body);
    return created(wallet);
  } catch (error: any) {
    console.error("Error creating wallet:", error);

    if (error.status === 422) {
      return error;
    }

    if (error.message.includes("already exists")) {
      return badRequest(error.message);
    }

    return serverError("Failed to create wallet");
  }
}
