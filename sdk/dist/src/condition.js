"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugCondition = plugCondition;
exports.setResolved = setResolved;
exports.tryRelease = tryRelease;
exports.fetchConditionConfig = fetchConditionConfig;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const pdas_1 = require("./pdas");
const utils_1 = require("./utils");
const condition_oracle_json_1 = __importDefault(require("./idl/condition_oracle.json"));
async function plugCondition(params) {
    const { connection, wallet, escrowState, condition } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(condition_oracle_json_1.default, provider);
    const [conditionConfig] = (0, pdas_1.deriveConditionConfig)(escrowState);
    const [releaseAuthority] = (0, pdas_1.deriveReleaseAuthority)(conditionConfig);
    const conditionParams = condition.type === "timestamp"
        ? {
            conditionType: { timestampAfter: {} },
            targetTimestamp: new anchor_1.BN(condition.targetTimestamp),
            resolveAuthority: wallet.publicKey,
        }
        : {
            conditionType: { manualBool: {} },
            targetTimestamp: new anchor_1.BN(0),
            resolveAuthority: condition.resolveAuthority,
        };
    const txSignature = await program.methods
        .initializeCondition(conditionParams)
        .accounts({
        payer: wallet.publicKey,
        escrowState,
        conditionConfig,
        releaseAuthority,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return { conditionConfig, releaseAuthority, txSignature };
}
async function setResolved(connection, wallet, conditionConfig) {
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(condition_oracle_json_1.default, provider);
    return program.methods
        .setResolved()
        .accounts({
        resolveAuthority: wallet.publicKey,
        conditionConfig,
    })
        .rpc();
}
async function tryRelease(params) {
    const { connection, wallet, conditionConfig, releaseAuthority, escrowState, vault, depositorAta, } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(condition_oracle_json_1.default, provider);
    return program.methods
        .tryRelease()
        .accounts({
        cranker: wallet.publicKey,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta,
        escrowCoreProgram: utils_1.ESCROW_CORE_PROGRAM_ID,
        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
    })
        .rpc();
}
async function fetchConditionConfig(connection, wallet, conditionConfig) {
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(condition_oracle_json_1.default, provider);
    return program.account.conditionConfig.fetch(conditionConfig);
}
