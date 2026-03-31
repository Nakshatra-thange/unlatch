import BN from "bn.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { ConditionOracle } from "../target/types/condition_oracle";
import type { EscrowCore } from "../target/types/escrow_core";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("condition-oracle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const oracle = anchor.workspace.ConditionOracle as Program<ConditionOracle>;
  const escrow = anchor.workspace.EscrowCore as Program<EscrowCore>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let ata: anchor.web3.PublicKey;
  let escrowState: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let conditionConfig: anchor.web3.PublicKey;
  let releaseAuthority: anchor.web3.PublicKey;

  before(async () => {
    mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    ata = await createAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );

    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      ata,
      wallet.payer,
      1_000_000
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
  });

  it("initialize + deposit", async () => {
    await escrow.methods
      .deposit(new BN(500_000), releaseAuthority)
      .accounts({
        depositor: wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta: ata,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    await oracle.methods
      .initializeCondition({
        conditionType: { manualBool: {} },
        targetTimestamp: new BN(0),
        resolveAuthority: wallet.publicKey,
      })
      .accounts({
        payer: wallet.publicKey,
        escrowState,
        conditionConfig,
        releaseAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();
  });

  it("try_release fails before resolved", async () => {
    try {
      await oracle.methods
        .tryRelease()
        .accounts({
          cranker: wallet.publicKey,
          conditionConfig,
          releaseAuthority,
          escrowState,
          vault,
          depositorAta: ata,
          escrowCoreProgram: escrow.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      assert.fail("should fail");
    } catch (err: any) {
      assert.include(err.message, "ConditionNotMet");
    }
  });

  it("set_resolved works", async () => {
    await oracle.methods
      .setResolved()
      .accounts({
        resolveAuthority: wallet.publicKey,
        conditionConfig,
      } as any)
      .rpc();

    const cfg = await oracle.account.conditionConfig.fetch(conditionConfig);
    assert.isTrue(cfg.resolved);
  });

  it("CPI release works", async () => {
    await oracle.methods
      .tryRelease()
      .accounts({
        cranker: wallet.publicKey,
        conditionConfig,
        releaseAuthority,
        escrowState,
        vault,
        depositorAta: ata,
        escrowCoreProgram: escrow.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    const vaultAcc = await getAccount(provider.connection, vault);
    assert.equal(vaultAcc.amount.toString(), "0");
  });
});