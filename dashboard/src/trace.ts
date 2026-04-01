import {
    Connection,
    PublicKey,
    ParsedTransactionWithMeta,
  } from "@solana/web3.js";
  
  import {
    ESCROW_CORE_PROGRAM_ID,
    CONDITION_ORACLE_PROGRAM_ID,
    MULTISIG_GUARD_PROGRAM_ID,
  } from "../../sdk/src/utils";
  
  export interface CPICall {
    depth:     number;
    programId: string;
    programName: string;
    instructionName: string;
  }
  
  // maps program IDs to human-readable names
  const PROGRAM_NAMES: Record<string, string> = {
    [ESCROW_CORE_PROGRAM_ID.toBase58()]:      "escrow-core",
    [CONDITION_ORACLE_PROGRAM_ID.toBase58()]: "condition-oracle",
    [MULTISIG_GUARD_PROGRAM_ID.toBase58()]:   "multisig-guard",
  };
  
  // maps 8-byte discriminators to instruction names
  // precomputed from sha256("global:<name>")[0..8]
  const DISCRIMINATORS: Record<string, string> = {
    // you can compute these with:
    // Buffer.from(sha256("global:deposit")).slice(0, 8).toString("hex")
    // fill these in after anchor build generates the IDLs
    "f223c68952e1f2b6": "deposit",
    "b712469c946da122": "release",
    "afaf6d1f0d989bed": "initialize_condition",
    "3bac94c7f00b7c2a": "set_resolved",
    "22bf30e2d5acf7a8": "try_release",
    "e4f99528f2ed69fd": "initialize_guard",
    "a0a0b4853d7f5b1a": "approve",
    "7b5e4a2c8f1d3e9b": "execute",
  };
  
  export async function parseCPITrace(
    connection: Connection,
    signature: string
  ): Promise<CPICall[]> {
    const tx = await connection.getParsedTransaction(signature, {
      commitment:                  "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  
    if (!tx || !tx.meta) return [];
  
    const calls: CPICall[] = [];
  
    // outer instruction — depth 0
    const outerProgramId = tx.transaction.message.accountKeys[0].pubkey.toBase58();
    calls.push({
      depth:           0,
      programId:       outerProgramId,
      programName:     PROGRAM_NAMES[outerProgramId] ?? outerProgramId.slice(0, 8) + "...",
      instructionName: "entry",
    });
  
    // inner instructions — depth increases with nesting
    if (tx.meta.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          const programId = (ix as any).programId?.toBase58() ?? "";
          const data      = (ix as any).data ?? "";
  
          // decode base58 data to get discriminator
          let ixName = "unknown";
          try {
            const decoded = Buffer.from(
              require("bs58").decode(data)
            );
            const discHex = decoded.slice(0, 8).toString("hex");
            ixName = DISCRIMINATORS[discHex] ?? discHex;
          } catch {
            ixName = "unknown";
          }
  
          calls.push({
            depth:           1,
            programId,
            programName:     PROGRAM_NAMES[programId] ?? programId.slice(0, 8) + "...",
            instructionName: ixName,
          });
        }
      }
    }
  
    return calls;
  }
  
  export async function getPDADerivationTree(
    depositor: PublicKey,
    mint: PublicKey
  ) {
    const { deriveAllPDAs } = await import("../../sdk/src/pdas");
    const pdas = deriveAllPDAs(depositor, mint);
  
    return [
      {
        label:   "escrow-core",
        seeds:   `[b"escrow", depositor, mint]`,
        address: pdas.escrowState.address.toBase58(),
        bump:    pdas.escrowState.bump,
        children: [
          {
            label:   "vault",
            seeds:   `[b"vault", escrow_state]`,
            address: pdas.vault.address.toBase58(),
            bump:    pdas.vault.bump,
            children: [],
          },
        ],
      },
      {
        label:   "condition-oracle",
        seeds:   `[b"condition", escrow_state]`,
        address: pdas.conditionConfig.address.toBase58(),
        bump:    pdas.conditionConfig.bump,
        children: [
          {
            label:   "release authority",
            seeds:   `[b"release", condition_config]`,
            address: pdas.releaseAuthority.address.toBase58(),
            bump:    pdas.releaseAuthority.bump,
            children: [],
          },
          {
            label:   "multisig-guard",
            seeds:   `[b"guard", condition_config]`,
            address: pdas.guardState.address.toBase58(),
            bump:    pdas.guardState.bump,
            children: [],
          },
        ],
      },
    ];
  }