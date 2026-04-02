import { readFileSync } from "fs";
import { SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveGuardState } from "./pdas.js";
import { makeProvider, MULTISIG_GUARD_PROGRAM_ID, CONDITION_ORACLE_PROGRAM_ID, ESCROW_CORE_PROGRAM_ID, } from "./utils.js";
const { Program } = anchor;
const MultisigGuardIdl = JSON.parse(readFileSync(new URL("./idl/multisig_guard.json", import.meta.url), "utf-8"));
export async function attachGuard(params) {
    const { connection, wallet, conditionConfig, approvers, requiredApprovals } = params;
    const provider = makeProvider(connection, wallet);
    const programId = MULTISIG_GUARD_PROGRAM_ID();
    const program = new Program({ ...MultisigGuardIdl, address: programId.toBase58() }, provider);
    const [guardState] = deriveGuardState(conditionConfig);
    const txSignature = await program.methods
        .initializeGuard(approvers, requiredApprovals)
        .accounts({
        payer: wallet.publicKey,
        conditionConfig,
        oracleProgram: CONDITION_ORACLE_PROGRAM_ID(),
        guardState,
        systemProgram: SystemProgram.programId,
    })
        .rpc();
    return { guardState, txSignature };
}
export async function approve(params) {
    const { connection, wallet, approver, guardState } = params;
    const provider = makeProvider(connection, wallet);
    const programId = MULTISIG_GUARD_PROGRAM_ID();
    const program = new Program({ ...MultisigGuardIdl, address: programId.toBase58() }, provider);
    return program.methods
        .approve()
        .accounts({
        approver: approver.publicKey,
        guardState,
    })
        .signers([approver])
        .rpc();
}
export async function execute(params) {
    const { connection, wallet, guardState, conditionConfig, releaseAuthority, escrowState, vault, depositorAta, } = params;
    const provider = makeProvider(connection, wallet);
    const programId = MULTISIG_GUARD_PROGRAM_ID();
    const program = new Program({ ...MultisigGuardIdl, address: programId.toBase58() }, provider);
    return program.methods
        .execute()
        .accounts({
        cranker: wallet.publicKey,
        guardState,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta,
        oracleProgram: CONDITION_ORACLE_PROGRAM_ID(),
        escrowCoreProgram: ESCROW_CORE_PROGRAM_ID(),
        tokenProgram: TOKEN_PROGRAM_ID,
    })
        .rpc();
}
export async function fetchGuardState(connection, wallet, guardState) {
    const provider = makeProvider(connection, wallet);
    const programId = MULTISIG_GUARD_PROGRAM_ID();
    const program = new Program({ ...MultisigGuardIdl, address: programId.toBase58() }, provider);
    return program.account.guardState.fetch(guardState);
}
