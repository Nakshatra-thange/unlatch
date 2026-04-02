import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import fs from "fs";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import anchor from "@coral-xyz/anchor";
import {
  createEscrow,
  plugCondition,
  attachGuard,
  approve,
  execute,
  deriveAllPDAs,
  useClusterProgramIds,
} from "../sdk/dist/index.js";

const { Wallet } = anchor;

async function main() {
  const secret = JSON.parse(
    fs.readFileSync("/Users/nakshatravijaythange/.config/solana/id.json", "utf-8")
  );
  const cluster = (process.env.UNLATCH_CLUSTER ?? "devnet") as "localnet" | "devnet";
  const rpcUrl  = cluster === "localnet"
    ? "http://127.0.0.1:8899"
    : clusterApiUrl("devnet");

  const connection = new Connection(rpcUrl, "confirmed");
  const programIds = useClusterProgramIds(cluster);
  const keypair    = Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet     = new Wallet(keypair);

  // Randomly generated signers for the 2-of-3 multisig
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  console.log("creating fresh mint...");
  const mint = await createMint(
    connection,
    keypair,           
    keypair.publicKey, 
    null,
    6
  );
  console.log("mint:", mint.toBase58());

  console.log("creating depositor ATA...");
  const depositorAta = await createAssociatedTokenAccount(
    connection,
    keypair,
    mint,
    keypair.publicKey
  );
  console.log("depositorAta:", depositorAta.toBase58());

  console.log("minting tokens...");
  await mintTo(
    connection,
    keypair,
    mint,
    depositorAta,
    keypair,
    5_000_000  
  );
  console.log("funded\n");

  console.log("cluster:", cluster);
  console.log("rpc:", rpcUrl);

  const pdas = deriveAllPDAs(keypair.publicKey, mint);

  console.log("initializing condition...");
  const { conditionConfig, releaseAuthority, txSignature: condTx } =
    await plugCondition({
      connection,
      wallet,
      escrowState: pdas.escrowState.address,
      condition: {
        type:            "timestamp",
        targetTimestamp: Math.floor(Date.now() / 1000) - 60,
      },
    });
  console.log("condition initialized:", condTx);

  console.log("depositing into escrow...");
  const { escrowState, txSignature: depositTx } = await createEscrow({
    connection,
    wallet,
    mint,
    amount:           1_000_000n,
    releaseAuthority,
  });
  console.log("deposited:", depositTx);

  console.log("attaching guard...");
  const { guardState, txSignature: guardTx } = await attachGuard({
    connection,
    wallet,
    conditionConfig,
    approvers:         [signer1.publicKey, signer2.publicKey, signer3.publicKey],
    requiredApprovals: 2,
  });
  console.log("guard attached:", guardTx);

  // --- FIX START: TRANSFER SOL INSTEAD OF AIRDROP ---
  console.log("funding signers from main wallet...");
  for (const kp of [signer1, signer2]) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: kp.publicKey,
        lamports: 50_000_000, // 0.05 SOL is plenty for transaction fees
      })
    );
    await sendAndConfirmTransaction(connection, transaction, [keypair]);
    console.log(`Funded ${kp.publicKey.toBase58()} with 0.05 SOL`);
  }
  // --- FIX END ---

  console.log("collecting approvals...");
  await approve({ connection, wallet, approver: signer1, guardState });
  await approve({ connection, wallet, approver: signer2, guardState });
  console.log("2-of-3 approvals collected");

  console.log("executing...");
  const vault = pdas.vault.address;

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

  console.log("\n3-hop CPI chain executed:", releaseTx);
  console.log("funds released — escrow complete");
}

main().catch(console.error);