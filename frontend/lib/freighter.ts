import { getAddress, isConnected, requestAccess } from "@stellar/freighter-api";

export async function checkFreighterInstalled() {
  const result = await isConnected();
  return { installed: result.isConnected, error: result.error?.message };
}

export async function getConnectedAddress() {
  const result = await getAddress();
  return { address: result.address, error: result.error?.message };
}

export async function connectFreighterWallet() {
  const result = await requestAccess();
  return { address: result.address, error: result.error?.message };
}

export function shortenAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}