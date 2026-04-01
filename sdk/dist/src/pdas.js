"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveEscrowState = deriveEscrowState;
exports.deriveVault = deriveVault;
exports.deriveConditionConfig = deriveConditionConfig;
exports.deriveReleaseAuthority = deriveReleaseAuthority;
exports.deriveGuardState = deriveGuardState;
exports.deriveAllPDAs = deriveAllPDAs;
const web3_js_1 = require("@solana/web3.js");
const utils_1 = require("./utils");
function deriveEscrowState(depositor, mint) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from("escrow"),
        depositor.toBuffer(),
        mint.toBuffer(),
    ], utils_1.ESCROW_CORE_PROGRAM_ID);
}
function deriveVault(escrowState) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vault"), escrowState.toBuffer()], utils_1.ESCROW_CORE_PROGRAM_ID);
}
function deriveConditionConfig(escrowState) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("condition"), escrowState.toBuffer()], utils_1.CONDITION_ORACLE_PROGRAM_ID);
}
function deriveReleaseAuthority(conditionConfig) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("release"), conditionConfig.toBuffer()], utils_1.CONDITION_ORACLE_PROGRAM_ID);
}
function deriveGuardState(conditionConfig) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("guard"), conditionConfig.toBuffer()], utils_1.MULTISIG_GUARD_PROGRAM_ID);
}
// returns all PDAs for a given depositor + mint in one call
// useful for the dashboard
function deriveAllPDAs(depositor, mint) {
    const [escrowState, escrowBump] = deriveEscrowState(depositor, mint);
    const [vault, vaultBump] = deriveVault(escrowState);
    const [conditionConfig, conditionBump] = deriveConditionConfig(escrowState);
    const [releaseAuthority, releaseBump] = deriveReleaseAuthority(conditionConfig);
    const [guardState, guardBump] = deriveGuardState(conditionConfig);
    return {
        escrowState: { address: escrowState, bump: escrowBump },
        vault: { address: vault, bump: vaultBump },
        conditionConfig: { address: conditionConfig, bump: conditionBump },
        releaseAuthority: { address: releaseAuthority, bump: releaseBump },
        guardState: { address: guardState, bump: guardBump },
    };
}
