import { getAddress, getNetworkDetails, isConnected, requestAccess } from "@stellar/freighter-api";

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

export async function isTestnetNetwork(): Promise<{ isTestnet: boolean; networkName: string; error?: string }> {
  try {
    const details = await getNetworkDetails();
    if (details.error) {
      return { isTestnet: true, networkName: "Unknown", error: details.error };
    }
    const network = (details.network || "").toUpperCase();
    const isTestnet = network.includes("TESTNET") || details.networkPassphrase.includes("Test SDF");
    return { isTestnet, networkName: details.network || "Testnet" };
  } catch (err) {
    return { isTestnet: true, networkName: "Testnet", error: err instanceof Error ? err.message : String(err) };
  }
}

export function shortenAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}