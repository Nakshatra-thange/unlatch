import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { Program } from "@coral-xyz/anchor";
import type { MultisigGuard }   from "../target/types/multisig_guard";
import type { ConditionOracle } from "../target/types/condition_oracle";
import type { EscrowCore }      from "../target/types/escrow_core";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("multisig-guard", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const guard  = anchor.workspace.MultisigGuard   as Program<MultisigGuard>;
  const oracle = anchor.workspace.ConditionOracle as Program<ConditionOracle>;
  const escrow = anchor.workspace.EscrowCore      as Program<EscrowCore>;
  const wallet = provider.wallet as anchor.Wallet;

  const signer1 = anchor.web3.Keypair.generate();
  const signer2 = anchor.web3.Keypair.generate();
  const signer3 = anchor.web3.Keypair.generate();

  let mint:             anchor.web3.PublicKey;
  let depositorAta:     anchor.web3.PublicKey;
  let escrowState:      anchor.web3.PublicKey;
  let vault:            anchor.web3.PublicKey;
  let conditionConfig:  anchor.web3.PublicKey;
  let releaseAuthority: anchor.web3.PublicKey;
  let guardState:       anchor.web3.PublicKey;

  before(async () => {
    for (const kp of [signer1, signer2, signer3]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    mint = await createMint(
      provider.connection, wallet.payer,
      wallet.publicKey, null, 6
    );
    depositorAta = await createAccount(
      provider.connection, wallet.payer, mint, wallet.publicKey
    );
    await mintTo(
      provider.connection, wallet.payer, mint,
      depositorAta, wallet.payer, 2_000_000
    );

    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer(), mint.toBuffer()],
      escrow.programId
    );
    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowState.toBuffer()],
      escrow.programId
    );
    [conditionConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("condition"), escrowState.toBuffer()],
      oracle.programId
    );
    [releaseAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("release"), conditionConfig.toBuffer()],
      oracle.programId
    );
    [guardState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("guard"), conditionConfig.toBuffer()],
      guard.programId
    );
  });

  // ----------------------------------------------------------------
  // TEST 1
  // use TimestampAfter with a past timestamp so it passes immediately
  // no need for set_resolved or waiting
  // ----------------------------------------------------------------
  it("sets up the full 3-layer stack", async () => {
    await escrow.methods
      .deposit(new BN(500_000), releaseAuthority)
      .accounts({
        depositor:     wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram:  anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    // past timestamp — condition is already met at the moment execute fires
    const pastTimestamp = Math.floor(Date.now() / 1000) - 60;

    await oracle.methods
      .initializeCondition({
        conditionType:    { timestampAfter: {} },
        targetTimestamp:  new BN(pastTimestamp),
        resolveAuthority: wallet.publicKey,
      })
      .accounts({
        payer:           wallet.publicKey,
        escrowState,
        conditionConfig,
        releaseAuthority,
        systemProgram:   anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    await guard.methods
      .initializeGuard(
        [signer1.publicKey, signer2.publicKey, signer3.publicKey],
        2
      )
      .accounts({
        payer:          wallet.publicKey,
        conditionConfig,
        oracleProgram:  oracle.programId,
        guardState,
        systemProgram:  anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    const gs = await guard.account.guardState.fetch(guardState);
    assert.equal(gs.requiredApprovals, 2);
    assert.equal(gs.approvalsCollected, 0);
    assert.isFalse(gs.isExecuted);
  });

  // ----------------------------------------------------------------
  // TEST 2
  // ----------------------------------------------------------------
  it("rejects execute with 0 approvals", async () => {
    try {
      await guard.methods
        .execute()
        .accounts({
          cranker:           wallet.publicKey,
          guardState,
          conditionConfig,
          releaseAuthority,
          escrowState,
          vault,
          depositorAta,
          oracleProgram:     oracle.programId,
          escrowCoreProgram: escrow.programId,
          tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();
      assert.fail("should have thrown InsufficientApprovals");
    } catch (err: any) {
      assert.include(err.message, "InsufficientApprovals");
    }
  });

  // ----------------------------------------------------------------
  // TEST 3
  // ----------------------------------------------------------------
  it("rejects approval from a non-approver", async () => {
    const nobody = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      nobody.publicKey, anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await guard.methods
        .approve()
        .accounts({ approver: nobody.publicKey, guardState } as any)
        .signers([nobody])
        .rpc();
      assert.fail("should have thrown NotAnApprover");
    } catch (err: any) {
      assert.include(err.message, "NotAnApprover");
    }
  });

  // ----------------------------------------------------------------
  // TEST 4
  // ----------------------------------------------------------------
  it("records first approval", async () => {
    await guard.methods
      .approve()
      .accounts({ approver: signer1.publicKey, guardState } as any)
      .signers([signer1])
      .rpc();

    const gs = await guard.account.guardState.fetch(guardState);
    assert.equal(gs.approvalsCollected, 1);

    // still not enough
    try {
      await guard.methods
        .execute()
        .accounts({
          cranker:           wallet.publicKey,
          guardState,
          conditionConfig,
          releaseAuthority,
          escrowState,
          vault,
          depositorAta,
          oracleProgram:     oracle.programId,
          escrowCoreProgram: escrow.programId,
          tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();
      assert.fail("should have thrown InsufficientApprovals");
    } catch (err: any) {
      assert.include(err.message, "InsufficientApprovals");
    }
  });

  // ----------------------------------------------------------------
  // TEST 5
  // ----------------------------------------------------------------
  it("rejects duplicate approval", async () => {
    try {
      await guard.methods
        .approve()
        .accounts({ approver: signer1.publicKey, guardState } as any)
        .signers([signer1])
        .rpc();
      assert.fail("should have thrown AlreadyApproved");
    } catch (err: any) {
      assert.include(err.message, "AlreadyApproved");
    }
  });

  // ----------------------------------------------------------------
  // TEST 6 — the 3-hop CPI chain
  // condition is already met (past timestamp from Test 1)
  // no set_resolved needed, no waiting
  // ----------------------------------------------------------------
  it("executes after 2 approvals (3-hop CPI)", async () => {
    await guard.methods
      .approve()
      .accounts({ approver: signer2.publicKey, guardState } as any)
      .signers([signer2])
      .rpc();

    const gs = await guard.account.guardState.fetch(guardState);
    assert.equal(gs.approvalsCollected, 2);

    const tx = await guard.methods
      .execute()
      .accounts({
        cranker:           wallet.publicKey,
        guardState,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta,
        oracleProgram:     oracle.programId,
        escrowCoreProgram: escrow.programId,
        tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    console.log("\n3-hop CPI tx:", tx);
    console.log("save this for the README\n");

    const vaultAccount = await getAccount(provider.connection, vault);
    assert.equal(vaultAccount.amount.toString(), "0");

    const state = await escrow.account.escrowState.fetch(escrowState);
    assert.isTrue(state.isReleased);

    const guardFinal = await guard.account.guardState.fetch(guardState);
    assert.isTrue(guardFinal.isExecuted);
  });

  // ----------------------------------------------------------------
  // TEST 7
  // ----------------------------------------------------------------
  it("rejects second execute", async () => {
    try {
      await guard.methods
        .execute()
        .accounts({
          cranker:           wallet.publicKey,
          guardState,
          conditionConfig,
          releaseAuthority,
          escrowState,
          vault,
          depositorAta,
          oracleProgram:     oracle.programId,
          escrowCoreProgram: escrow.programId,
          tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();
      assert.fail("should have thrown AlreadyExecuted");
    } catch (err: any) {
      assert.include(err.message, "AlreadyExecuted");
    }
  });

  // ----------------------------------------------------------------
  // TEST 8 — 2-program flow without guard
  // use a past timestamp so it passes immediately, no waiting
  // ----------------------------------------------------------------
  it("2-program flow works without guard", async () => {
    const mint2 = await createMint(
      provider.connection, wallet.payer, wallet.publicKey, null, 6
    );
    const ata2 = await createAccount(
      provider.connection, wallet.payer, mint2, wallet.publicKey
    );
    await mintTo(
      provider.connection, wallet.payer, mint2, ata2, wallet.payer, 1_000_000
    );

    const [es2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer(), mint2.toBuffer()],
      escrow.programId
    );
    const [v2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), es2.toBuffer()], escrow.programId
    );
    const [cc2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("condition"), es2.toBuffer()], oracle.programId
    );
    const [ra2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("release"), cc2.toBuffer()], oracle.programId
    );

    await escrow.methods
      .deposit(new BN(200_000), ra2)
      .accounts({
        depositor:     wallet.publicKey,
        mint:          mint2,
        escrowState:   es2,
        vault:         v2,
        depositorAta:  ata2,
        tokenProgram:  anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    // past timestamp — fires immediately, no sleep needed
    const pastTimestamp = Math.floor(Date.now() / 1000) - 60;

    await oracle.methods
      .initializeCondition({
        conditionType:    { timestampAfter: {} },
        targetTimestamp:  new BN(pastTimestamp),
        resolveAuthority: wallet.publicKey,
      })
      .accounts({
        payer:            wallet.publicKey,
        escrowState:      es2,
        conditionConfig:  cc2,
        releaseAuthority: ra2,
        systemProgram:    anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    await oracle.methods
      .tryRelease()
      .accounts({
        cranker:           wallet.publicKey,
        conditionConfig:   cc2,
        releaseAuthority:  ra2,
        escrowState:       es2,
        vault:             v2,
        depositorAta:      ata2,
        escrowCoreProgram: escrow.programId,
        tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    const vAcc = await getAccount(provider.connection, v2);
    assert.equal(vAcc.amount.toString(), "0");

    const state = await escrow.account.escrowState.fetch(es2);
    assert.isTrue(state.isReleased);
  });
});