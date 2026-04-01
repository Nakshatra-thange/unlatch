import { PublicKey, Connection } from "@solana/web3.js";
import type { Wallet } from "@coral-xyz/anchor";
export type ConditionType = {
    type: "timestamp";
    targetTimestamp: number;
} | {
    type: "manual";
    resolveAuthority: PublicKey;
};
export interface CreateEscrowParams {
    connection: Connection;
    wallet: Wallet;
    mint: PublicKey;
    amount: bigint;
    releaseAuthority: PublicKey;
}
export interface CreateEscrowResult {
    escrowState: PublicKey;
    vault: PublicKey;
    txSignature: string;
}
export interface PlugConditionParams {
    connection: Connection;
    wallet: Wallet;
    escrowState: PublicKey;
    condition: ConditionType;
}
export interface PlugConditionResult {
    conditionConfig: PublicKey;
    releaseAuthority: PublicKey;
    txSignature: string;
}
export interface AttachGuardParams {
    connection: Connection;
    wallet: Wallet;
    conditionConfig: PublicKey;
    approvers: PublicKey[];
    requiredApprovals: number;
}
export interface AttachGuardResult {
    guardState: PublicKey;
    txSignature: string;
}
export interface ApproveParams {
    connection: Connection;
    wallet: Wallet;
    approver: import("@solana/web3.js").Keypair;
    guardState: PublicKey;
}
export interface ExecuteParams {
    connection: Connection;
    wallet: Wallet;
    guardState: PublicKey;
    conditionConfig: PublicKey;
    releaseAuthority: PublicKey;
    escrowState: PublicKey;
    vault: PublicKey;
    depositorAta: PublicKey;
    mint: PublicKey;
}
export interface TryReleaseParams {
    connection: Connection;
    wallet: Wallet;
    conditionConfig: PublicKey;
    releaseAuthority: PublicKey;
    escrowState: PublicKey;
    vault: PublicKey;
    depositorAta: PublicKey;
    mint: PublicKey;
}
export interface UnlatchConfig {
    escrowCoreProgram: PublicKey;
    conditionOracleProgram: PublicKey;
    multisigGuardProgram: PublicKey;
}
