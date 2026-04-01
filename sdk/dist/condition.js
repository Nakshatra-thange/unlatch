import { readFileSync } from "fs";
import { SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveConditionConfig, deriveReleaseAuthority } from "./pdas.js";
import { makeProvider, ESCROW_CORE_PROGRAM_ID } from "./utils.js";
const { Program, BN } = anchor;
const ConditionOracleIdl = JSON.parse(readFileSync(new URL("./idl/condition_oracle.json", import.meta.url), "utf-8"));
export async function plugCondition(params) {
    const { connection, wallet, escrowState, condition } = params;
    const provider = makeProvider(connection, wallet);
    const program = new Program(ConditionOracleIdl, provider);
    const [conditionConfig] = deriveConditionConfig(escrowState);
    const [releaseAuthority] = deriveReleaseAuthority(conditionConfig);
    const conditionParams = condition.type === "timestamp"
        ? {
            conditionType: { timestampAfter: {} },
            targetTimestamp: new BN(condition.targetTimestamp),
            resolveAuthority: wallet.publicKey,
        }
        : {
            conditionType: { manualBool: {} },
            targetTimestamp: new BN(0),
            resolveAuthority: condition.resolveAuthority,
        };
    const txSignature = await program.methods
        .initializeCondition(conditionParams)
        .accounts({
        payer: wallet.publicKey,
        escrowState,
        conditionConfig,
        releaseAuthority,
        systemProgram: SystemProgram.programId,
    })
        .rpc();
    return { conditionConfig, releaseAuthority, txSignature };
}
export async function setResolved(connection, wallet, conditionConfig) {
    const provider = makeProvider(connection, wallet);
    const program = new Program(ConditionOracleIdl, provider);
    return program.methods
        .setResolved()
        .accounts({
        resolveAuthority: wallet.publicKey,
        conditionConfig,
    })
        .rpc();
}
export async function tryRelease(params) {
    const { connection, wallet, conditionConfig, releaseAuthority, escrowState, vault, depositorAta, } = params;
    const provider = makeProvider(connection, wallet);
    const program = new Program(ConditionOracleIdl, provider);
    return program.methods
        .tryRelease()
        .accounts({
        cranker: wallet.publicKey,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta,
        escrowCoreProgram: ESCROW_CORE_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
    })
        .rpc();
}
export async function fetchConditionConfig(connection, wallet, conditionConfig) {
    const provider = makeProvider(connection, wallet);
    const program = new Program(ConditionOracleIdl, provider);
    return program.account.conditionConfig.fetch(conditionConfig);
}
