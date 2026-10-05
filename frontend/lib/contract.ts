"use client";

import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import { signTransaction as freighterSignTransaction } from "@stellar/freighter-api";
import { signAndSubmitWithPasskey } from "./passkey";
import type { ConnectedWallet } from "@/components/WalletConnect";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

function i128(value: string) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

async function buildAndSign(
  method: "mint" | "burn",
  wallet: ConnectedWallet,
  args: unknown[],
) {
  if (!CONTRACT_ID) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  }

  const tx = await AssembledTransaction.build({
    method,
    args,
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: wallet.address,
    parseResultXdr: () => undefined,
    ...(wallet.kind === "freighter"
      ? { signTransaction: freighterSignTransaction }
      : {}),
  });

  if (wallet.kind === "freighter") {
    const sent = await tx.signAndSend();
    return { hash: sent.sendTransactionResponse?.hash ?? "" };
  }

  return signAndSubmitWithPasskey(tx);
}

export async function mint(
  wallet: ConnectedWallet,
  collateralAmount: string,
  mintAmount: string,
): Promise<{ hash: string }> {
  const user = new Address(wallet.address).toScVal();
  return buildAndSign("mint", wallet, [user, i128(collateralAmount), i128(mintAmount)]);
}

export async function burn(
  wallet: ConnectedWallet,
  burnAmount: string,
): Promise<{ hash: string }> {
  const user = new Address(wallet.address).toScVal();
  return buildAndSign("burn", wallet, [user, i128(burnAmount)]);
}

export const CONTRACT_ERRORS: Record<number, string> = {
  1: "Protocol already initialized (AlreadyInitialized)",
  2: "Protocol not initialized (NotInitialized)",
  3: "Invalid configuration parameters (InvalidConfig)",
  4: "Invalid price provided (InvalidPrice)",
  5: "Oracle price has not been set yet (PriceNotSet)",
  6: "Amount must be strictly greater than zero (InvalidAmount)",
  7: "Insufficient collateral ratio: position would be under-collateralized (InsufficientCollateral)",
  8: "No active debt position found for this address (NoPosition)",
  9: "Position is healthy and cannot be liquidated (PositionHealthy)",
  10: "Division by zero in calculation (DivisionByZero)",
  11: "Collateral token is not in the approved list (UnapprovedCollateral)",
};

export function parseContractError(error: unknown): string {
  if (!error) return "Unknown error occurred";
  const message = error instanceof Error ? error.message : String(error);

  // Check for Soroban contract error code pattern: Error(Contract, #123) or Error(123)
  const match = message.match(/Error\((?:Contract,\s*)?#?(\d+)\)/);
  if (match) {
    const code = parseInt(match[1], 10);
    if (CONTRACT_ERRORS[code]) {
      return CONTRACT_ERRORS[code];
    }
    return `Contract error code #${code}`;
  }

  // Common Freighter / user rejections
  if (message.includes("User declined") || message.includes("User cancelled")) {
    return "Transaction was cancelled by user";
  }

  return message;
}

export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
