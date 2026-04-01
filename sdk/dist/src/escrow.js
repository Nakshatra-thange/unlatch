"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEscrow = createEscrow;
exports.fetchEscrowState = fetchEscrowState;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const pdas_1 = require("./pdas");
const utils_1 = require("./utils");
const escrow_core_json_1 = __importDefault(require("./idl/escrow_core.json"));
async function createEscrow(params) {
    const { connection, wallet, mint, amount, releaseAuthority } = params;
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(escrow_core_json_1.default, provider);
    const [escrowState] = (0, pdas_1.deriveEscrowState)(wallet.publicKey, mint);
    const [vault] = (0, pdas_1.deriveVault)(escrowState);
    const depositorAta = await (0, spl_token_1.getAssociatedTokenAddress)(mint, wallet.publicKey);
    const txSignature = await program.methods
        .deposit(new anchor_1.BN(amount.toString()), releaseAuthority)
        .accounts({
        depositor: wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return { escrowState, vault, txSignature };
}
async function fetchEscrowState(connection, wallet, escrowState) {
    const provider = (0, utils_1.makeProvider)(connection, wallet);
    const program = new anchor_1.Program(escrow_core_json_1.default, provider);
    return program.account.escrowState.fetch(escrowState);
}
