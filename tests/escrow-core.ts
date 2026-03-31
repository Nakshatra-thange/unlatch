import * as anchor from "@coral-xyz/anchor";
import { Program }  from "@coral-xyz/anchor";
//import { EscrowCore } from "../target/types/escrow_core";
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

  const program   = anchor.workspace.EscrowCore as Program<EscrowCore>;
  const depositor = provider.wallet as anchor.Wallet;

  let mint:         anchor.web3.PublicKey;
  let depositorAta: anchor.web3.PublicKey;
  let escrowState:  anchor.web3.PublicKey;
  let vault:        anchor.web3.PublicKey;

  // a fake oracle keypair — used to simulate the release_authority
  const fakeOracle = anchor.web3.Keypair.generate();

  before(async () => {
    // create mint
    mint = await createMint(
      provider.connection,
      depositor.payer,
      depositor.publicKey,
      null,
      6
    );

    // create depositor ATA and mint 1000 tokens
    depositorAta = await createAccount(
      provider.connection,
      depositor.payer,
      mint,
      depositor.publicKey
    );
    await mintTo(
      provider.connection,
      depositor.payer,
      mint,
      depositorAta,
      depositor.payer,
      1_000_000 // 1 token at 6 decimals
    );

    // derive PDAs
    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        depositor.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      program.programId
    );

    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowState.toBuffer()],
      program.programId
    );
  });

  // ----------------------------------------------------------------
  // TEST 1: deposit succeeds, vault receives funds
  // ----------------------------------------------------------------
  it("deposits tokens into the vault", async () => {
    await program.methods
      .deposit(new anchor.BN(500_000), fakeOracle.publicKey)
      .accounts({
        depositor:    depositor.publicKey,
        mint,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultAccount = await getAccount(provider.connection, vault);
    assert.equal(vaultAccount.amount.toString(), "500000");

    const state = await program.account.escrowState.fetch(escrowState);
    assert.equal(state.amount.toString(), "500000");
    assert.equal(state.releaseAuthority.toBase58(), fakeOracle.publicKey.toBase58());
    assert.isFalse(state.isReleased);
  });

  // ----------------------------------------------------------------
  // TEST 2: direct release with wrong signer fails
  // ----------------------------------------------------------------
  it("rejects release from an unauthorized signer", async () => {
    const badActor = anchor.web3.Keypair.generate();

    // airdrop so it can sign
    await provider.connection.requestAirdrop(
      badActor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise(r => setTimeout(r, 1000));

    try {
      await program.methods
        .release()
        .accounts({
          releaseAuthority: badActor.publicKey,
          escrowState,
          vault,
          depositorAta,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([badActor])
        .rpc();

      assert.fail("should have thrown UnauthorizedCaller");
    } catch (err: any) {
      assert.include(err.message, "UnauthorizedCaller");
    }
  });

  // ----------------------------------------------------------------
  // TEST 3: release succeeds when fakeOracle (the stored authority) signs
  // ----------------------------------------------------------------
  it("releases funds when release_authority signs", async () => {
    // airdrop to fakeOracle so it can pay tx fee
    await provider.connection.requestAirdrop(
      fakeOracle.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise(r => setTimeout(r, 1000));

    await program.methods
      .release()
      .accounts({
        releaseAuthority: fakeOracle.publicKey,
        escrowState,
        vault,
        depositorAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([fakeOracle])
      .rpc();

    // vault should be empty
    const vaultAccount = await getAccount(provider.connection, vault);
    assert.equal(vaultAccount.amount.toString(), "0");

    // state should be marked released
    const state = await program.account.escrowState.fetch(escrowState);
    assert.isTrue(state.isReleased);
  });

  // ----------------------------------------------------------------
  // TEST 4: double-release is rejected
  // ----------------------------------------------------------------
  it("rejects a second release on the same escrow", async () => {
    try {
      await program.methods
        .release()
        .accounts({
          releaseAuthority: fakeOracle.publicKey,
          escrowState,
          vault,
          depositorAta,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([fakeOracle])
        .rpc();

      assert.fail("should have thrown AlreadyReleased");
    } catch (err: any) {
      assert.include(err.message, "AlreadyReleased");
    }
  });
});

