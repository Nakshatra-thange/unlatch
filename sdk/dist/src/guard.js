"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachGuard = attachGuard;
exports.approve = approve;
exports.execute = execute;
exports.fetchGuardState = fetchGuardState;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const pdas_1 = require("./pdas");
const utils_1 = require("./utils");
const multisig_guard_json_1 = __importDefault(require("./idl/multisig_guard.json"));
async function attachGuard(params) {
    const { connection, wallet, conditionConfig, approvers, requiredApprovals } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(multisig_guard_json_1.default, provider);
    const [guardState] = (0, pdas_1.deriveGuardState)(conditionConfig);
    const txSignature = await program.methods
        .initializeGuard(approvers, requiredApprovals)
        .accounts({
        payer: wallet.publicKey,
        conditionConfig,
        oracleProgram: utils_1.CONDITION_ORACLE_PROGRAM_ID,
        guardState,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return { guardState, txSignature };
}
async function approve(params) {
    const { connection, wallet, approver, guardState } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(multisig_guard_json_1.default, provider);
    return program.methods
        .approve()
        .accounts({
        approver: approver.publicKey,
        guardState,
    })
        .signers([approver])
        .rpc();
}
async function execute(params) {
    const { connection, wallet, guardState, conditionConfig, releaseAuthority, escrowState, vault, depositorAta, } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(multisig_guard_json_1.default, provider);
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
        oracleProgram: utils_1.CONDITION_ORACLE_PROGRAM_ID,
        escrowCoreProgram: utils_1.ESCROW_CORE_PROGRAM_ID,
        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
    })
        .rpc();
}
async function fetchGuardState(connection, wallet, guardState) {
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(multisig_guard_json_1.default, provider);
    return program.account.guardState.fetch(guardState);
}
