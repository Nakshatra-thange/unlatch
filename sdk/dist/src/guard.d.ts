import { PublicKey } from "@solana/web3.js";
import type { AttachGuardParams, AttachGuardResult, ApproveParams, ExecuteParams } from "./types";
export declare function attachGuard(params: AttachGuardParams): Promise<AttachGuardResult>;
export declare function approve(params: ApproveParams): Promise<string>;
export declare function execute(params: ExecuteParams): Promise<string>;
export declare function fetchGuardState(connection: import("@solana/web3.js").Connection, wallet: import("@coral-xyz/anchor").Wallet, guardState: PublicKey): Promise<{
    conditionConfig: PublicKey;
    oracleProgram: PublicKey;
    requiredApprovals: number;
    approvalsCollected: number;
    approvedSigners: PublicKey[];
    approvedBy: PublicKey[];
    isExecuted: boolean;
    bump: number;
}>;
