import BN from "bn.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { EscrowCore } from "../target/types/escrow_core";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow-core", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.EscrowCore as Program<EscrowCore>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let depositorAta: anchor.web3.PublicKey;
  let escrowState: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const fakeOracle = anchor.web3.Keypair.generate();

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
      1_000_000
    );

    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowState.toBuffer()],
      program.programId
    );
  });

  it("deposit works", async () => {
    await program.methods
      .deposit(new BN(500_000), fakeOracle.publicKey)
      .accounts({
        depositor: wallet.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    const vaultAcc = await getAccount(provider.connection, vault);
    assert.equal(vaultAcc.amount.toString(), "500000");
  });

  it("unauthorized release fails", async () => {
    const bad = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .release()
        .accounts({
          releaseAuthority: bad.publicKey,
          escrowState,
          vault,
          depositorAta,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      assert.fail("should fail");
    } catch (err: any) {
      assert.include(err.message, "UnauthorizedCaller");
    }
  });

  it("authorized release works", async () => {
    await program.methods
      .release()
      .accounts({
        releaseAuthority: fakeOracle.publicKey,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    const vaultAcc = await getAccount(provider.connection, vault);
    assert.equal(vaultAcc.amount.toString(), "0");

    const state = await program.account.escrowState.fetch(escrowState);
    assert.isTrue(state.isReleased);
  });

  it("double release fails", async () => {
    try {
      await program.methods
        .release()
        .accounts({
          releaseAuthority: fakeOracle.publicKey,
          escrowState,
          vault,
          depositorAta,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      assert.fail("should fail");
    } catch (err: any) {
      assert.include(err.message, "AlreadyReleased");
    }
  });
});