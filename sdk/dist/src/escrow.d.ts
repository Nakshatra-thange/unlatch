import { PublicKey } from "@solana/web3.js";
import type { CreateEscrowParams, CreateEscrowResult } from "./types";
export declare function createEscrow(params: CreateEscrowParams): Promise<CreateEscrowResult>;
export declare function fetchEscrowState(connection: import("@solana/web3.js").Connection, wallet: import("@coral-xyz/anchor").Wallet, escrowState: PublicKey): Promise<{
    depositor: PublicKey;
    mint: PublicKey;
    amount: BN;
    releaseAuthority: PublicKey;
    bump: number;
    vaultBump: number;
    isReleased: boolean;
}>;
