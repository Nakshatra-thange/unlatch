import * as anchor from "@coral-xyz/anchor";
import { Program }  from "@coral-xyz/anchor";
import { ConditionOracle } from "../target/types/condition_oracle";
import { EscrowCore }      from "../target/types/escrow_core";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("condition-oracle", () => {
  const provider   = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const oracle  = anchor.workspace.ConditionOracle as Program<ConditionOracle>;
  const escrow  = anchor.workspace.EscrowCore     as Program<EscrowCore>;
  const wallet  = provider.wallet as anchor.Wallet;

  let mint:            anchor.web3.PublicKey;
  let depositorAta:    anchor.web3.PublicKey;
  let escrowState:     anchor.web3.PublicKey;
  let vault:           anchor.web3.PublicKey;
  let conditionConfig: anchor.web3.PublicKey;
  let releaseAuthority: anchor.web3.PublicKey;

  // ---- setup -------------------------------------------------------
  before(async () => {
    mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    depositorAta = await createAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      depositorAta,
      wallet.payer,
      2_000_000
    );

    // derive condition PDAs first so we know release_authority
    // before calling escrow deposit
    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        wallet.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
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
  });

  // ----------------------------------------------------------------
  // TEST 1: initialize a ManualBool condition
  // ----------------------------------------------------------------
  it("initializes a ManualBool condition", async () => {
    // first deposit into escrow using the oracle's release_authority
    await escrow.methods
      .deposit(new anchor.BN(500_000), releaseAuthority)
      .accounts({
        depositor:     wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram:  anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // now initialize the condition
    await oracle.methods
      .initializeCondition({
        conditionType:   { manualBool: {} },
        targetTimestamp: new anchor.BN(0), // unused for ManualBool
        resolveAuthority: wallet.publicKey,
      })
      .accounts({
        payer:           wallet.publicKey,
        escrowState,
        conditionConfig,
        releaseAuthority,
        systemProgram:   anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await oracle.account.conditionConfig.fetch(conditionConfig);
    assert.isFalse(config.resolved);
    assert.deepEqual(config.conditionType, { manualBool: {} });
    assert.equal(config.escrowState.toBase58(), escrowState.toBase58());
  });

  // ----------------------------------------------------------------
  // TEST 2: try_release fails before condition is met
  // ----------------------------------------------------------------
  it("rejects try_release when condition is not met", async () => {
    try {
      await oracle.methods
        .tryRelease()
        .accounts({
          cranker:          wallet.publicKey,
          conditionConfig,
          releaseAuthority,
          escrowState,
          vault,
          depositorAta,
          escrowCoreProgram: escrow.programId,
          tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("should have thrown ConditionNotMet");
    } catch (err: any) {
      assert.include(err.message, "ConditionNotMet");
    }
  });

  // ----------------------------------------------------------------
  // TEST 3: set_resolved flips the bool
  // ----------------------------------------------------------------
  it("sets resolved to true via set_resolved", async () => {
    await oracle.methods
      .setResolved()
      .accounts({
        resolveAuthority: wallet.publicKey,
        conditionConfig,
      })
      .rpc();

    const config = await oracle.account.conditionConfig.fetch(conditionConfig);
    assert.isTrue(config.resolved);
  });

  // ----------------------------------------------------------------
  // TEST 4: try_release succeeds — full two-program CPI chain fires
  // ----------------------------------------------------------------
  it("releases escrow via CPI after condition is met", async () => {
    await oracle.methods
      .tryRelease()
      .accounts({
        cranker:          wallet.publicKey,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta,
        escrowCoreProgram: escrow.programId,
        tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    // vault should be empty
    const vaultAccount = await getAccount(provider.connection, vault);
    assert.equal(vaultAccount.amount.toString(), "0");

    // escrow marked released
    const state = await escrow.account.escrowState.fetch(escrowState);
    assert.isTrue(state.isReleased);
  });

  // ----------------------------------------------------------------
  // TEST 5: TimestampAfter — initialize, wait, release
  // ----------------------------------------------------------------
  it("releases via TimestampAfter condition", async () => {
    // new depositor ATA with fresh funds for a second escrow
    // we need a new mint to get a fresh escrow PDA
    const mint2 = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );
    const ata2 = await createAccount(
      provider.connection,
      wallet.payer,
      mint2,
      wallet.publicKey
    );
    await mintTo(
      provider.connection,
      wallet.payer,
      mint2,
      ata2,
      wallet.payer,
      1_000_000
    );

    // derive fresh PDAs for mint2
    const [escrow2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer(), mint2.toBuffer()],
      escrow.programId
    );
    const [vault2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrow2.toBuffer()],
      escrow.programId
    );
    const [cond2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("condition"), escrow2.toBuffer()],
      oracle.programId
    );
    const [rel2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("release"), cond2.toBuffer()],
      oracle.programId
    );

    // deposit
    await escrow.methods
      .deposit(new anchor.BN(300_000), rel2)
      .accounts({
        depositor:     wallet.publicKey,
        mint:          mint2,
        escrowState:   escrow2,
        vault:         vault2,
        depositorAta:  ata2,
        tokenProgram:  anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // set timestamp 2 seconds in the past so it passes immediately
    const pastTimestamp = Math.floor(Date.now() / 1000) - 2;

    await oracle.methods
      .initializeCondition({
        conditionType:    { timestampAfter: {} },
        targetTimestamp:  new anchor.BN(pastTimestamp),
        resolveAuthority: wallet.publicKey,
      })
      .accounts({
        payer:           wallet.publicKey,
        escrowState:     escrow2,
        conditionConfig: cond2,
        releaseAuthority: rel2,
        systemProgram:   anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // try_release should succeed immediately
    await oracle.methods
      .tryRelease()
      .accounts({
        cranker:           wallet.publicKey,
        conditionConfig:   cond2,
        releaseAuthority:  rel2,
        escrowState:       escrow2,
        vault:             vault2,
        depositorAta:      ata2,
        escrowCoreProgram: escrow.programId,
        tokenProgram:      anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultAccount = await getAccount(provider.connection, vault2);
    assert.equal(vaultAccount.amount.toString(), "0");
  });
});