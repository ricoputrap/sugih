import { NextRequest } from "next/server";
import { updateWallet, archiveWallet, deleteWallet, getWalletById } from "@/modules/Wallet/actions";
import { ok, badRequest, serverError } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletById(params.id);

    if (!wallet) {
      return badRequest("Wallet not found");
    }

    return ok(wallet);
  } catch (error: any) {
    console.error("Error fetching wallet:", error);
    return serverError("Failed to fetch wallet");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const wallet = await updateWallet(params.id, body);
    return ok(wallet);
  } catch (error: any) {
    console.error("Error updating wallet:", error);

    if (error.status === 422) {
      return error;
    }

    if (error.message.includes("not found")) {
      return badRequest(error.message);
    }

    if (error.message.includes("already exists")) {
      return badRequest(error.message);
    }

    return serverError("Failed to update wallet");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if this is a soft delete (archive) or hard delete
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "archive";

    if (action === "archive") {
      // Soft delete - archive the wallet
      const wallet = await archiveWallet(params.id);
      return ok({ message: "Wallet archived successfully", wallet });
    } else if (action === "delete") {
      // Hard delete - permanently delete the wallet
      await deleteWallet(params.id);
      return ok({ message: "Wallet deleted successfully" });
    } else {
      return badRequest("Invalid action. Use 'archive' or 'delete'");
    }
  } catch (error: any) {
    console.error("Error deleting wallet:", error);

    if (error.status === 422) {
      return error;
    }

    if (error.message.includes("not found")) {
      return badRequest(error.message);
    }

    if (error.message.includes("transactions")) {
      return badRequest(error.message);
    }

    return serverError("Failed to delete wallet");
  }
}
