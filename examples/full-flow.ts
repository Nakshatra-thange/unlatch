import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import fs from "fs";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import anchor from "@coral-xyz/anchor";
import {
  createEscrow,
  plugCondition,
  attachGuard,
  approve,
  execute,
  deriveAllPDAs,
} from "../sdk/dist/index.js";

const { Wallet } = anchor;

async function main() {
  const secret = JSON.parse(
    fs.readFileSync("/Users/nakshatravijaythange/.config/solana/id.json", "utf-8")
  );
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // your funded wallet
  const keypair  = Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet   = new Wallet(keypair);

  // three approvers for the 2-of-3 guard
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  const mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  // step 1: set up the condition first to get release_authority
  // this address must be passed into createEscrow
  const { conditionConfig, releaseAuthority, txSignature: condTx } =
    await plugCondition({
      connection,
      wallet,
      escrowState: deriveAllPDAs(keypair.publicKey, mint).escrowState.address,
      condition: {
        type: "timestamp",
        targetTimestamp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      },
    });

  console.log("condition initialized:", condTx);

  // step 2: deposit — vault is locked until condition fires
  const { escrowState, txSignature: depositTx } = await createEscrow({
    connection,
    wallet,
    mint,
    amount: 1_000_000n, // 1 USDC
    releaseAuthority,
  });

  console.log("deposited into escrow:", depositTx);

  // step 3: attach a 2-of-3 multisig guard in front of the condition
  const { guardState, txSignature: guardTx } = await attachGuard({
    connection,
    wallet,
    conditionConfig,
    approvers: [signer1.publicKey, signer2.publicKey, signer3.publicKey],
    requiredApprovals: 2,
  });

  console.log("guard attached:", guardTx);

  // step 4: collect approvals
  await approve({ connection, wallet, approver: signer1, guardState });
  await approve({ connection, wallet, approver: signer2, guardState });

  console.log("2-of-3 approvals collected");

  // step 5: execute — fires guard -> oracle -> escrow-core
  const { address: vault }        = deriveAllPDAs(keypair.publicKey, mint).vault;
  const depositorAta = await getAssociatedTokenAddress(
    mint,
    keypair.publicKey
  );

  const releaseTx = await execute({
    connection,
    wallet,
    guardState,
    conditionConfig,
    releaseAuthority,
    escrowState,
    vault,
    depositorAta,
    mint,
  });

  console.log("3-hop CPI chain executed:", releaseTx);
  console.log("funds released — escrow complete");
}

main().catch(console.error);
