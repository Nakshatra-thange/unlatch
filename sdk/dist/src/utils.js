"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROGRAM_ID = exports.TOKEN_PROGRAM_ID = exports.MULTISIG_GUARD_PROGRAM_ID = exports.CONDITION_ORACLE_PROGRAM_ID = exports.ESCROW_CORE_PROGRAM_ID = void 0;
exports.makeProvider = makeProvider;
exports.sleep = sleep;
exports.getAta = getAta;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
// replace with your deployed program IDs after anchor deploy
exports.ESCROW_CORE_PROGRAM_ID = new web3_js_1.PublicKey("YOUR_ESCROW_PROGRAM_ID");
exports.CONDITION_ORACLE_PROGRAM_ID = new web3_js_1.PublicKey("YOUR_ORACLE_PROGRAM_ID");
exports.MULTISIG_GUARD_PROGRAM_ID = new web3_js_1.PublicKey("YOUR_GUARD_PROGRAM_ID");
exports.TOKEN_PROGRAM_ID = new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
exports.SYSTEM_PROGRAM_ID = new web3_js_1.PublicKey("11111111111111111111111111111111");
function makeProvider(connection, wallet, commitment = "confirmed") {
    return new anchor_1.AnchorProvider(connection, wallet, { commitment });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// returns the associated token account address for owner + mint
async function getAta(mint, owner) {
    const { getAssociatedTokenAddress } = await Promise.resolve().then(() => __importStar(require("@solana/spl-token")));
    return getAssociatedTokenAddress(mint, owner);
}
