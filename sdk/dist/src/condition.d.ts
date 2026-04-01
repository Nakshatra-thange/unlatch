import { PublicKey } from "@solana/web3.js";
import type { PlugConditionParams, PlugConditionResult, TryReleaseParams } from "./types";
export declare function plugCondition(params: PlugConditionParams): Promise<PlugConditionResult>;
export declare function setResolved(connection: import("@solana/web3.js").Connection, wallet: import("@coral-xyz/anchor").Wallet, conditionConfig: PublicKey): Promise<string>;
export declare function tryRelease(params: TryReleaseParams): Promise<string>;
export declare function fetchConditionConfig(connection: import("@solana/web3.js").Connection, wallet: import("@coral-xyz/anchor").Wallet, conditionConfig: PublicKey): Promise<{
    escrowState: PublicKey;
    conditionType: any;
    targetTimestamp: BN;
    resolved: boolean;
    resolveAuthority: PublicKey;
    bump: number;
    releaseBump: number;
}>;
