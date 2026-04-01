import { PublicKey, Connection, Commitment } from "@solana/web3.js";
import { AnchorProvider, Wallet, Program, Idl } from "@coral-xyz/anchor";

// replace with your deployed program IDs after anchor deploy
export const ESCROW_CORE_PROGRAM_ID      = new PublicKey("YOUR_ESCROW_PROGRAM_ID");
export const CONDITION_ORACLE_PROGRAM_ID = new PublicKey("YOUR_ORACLE_PROGRAM_ID");
export const MULTISIG_GUARD_PROGRAM_ID   = new PublicKey("YOUR_GUARD_PROGRAM_ID");

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

export function makeProvider(
  connection: Connection,
  wallet: Wallet,
  commitment: Commitment = "confirmed"
): AnchorProvider {
  return new AnchorProvider(connection, wallet, { commitment });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// returns the associated token account address for owner + mint
export async function getAta(
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  return getAssociatedTokenAddress(mint, owner);
}