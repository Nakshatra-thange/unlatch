import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Unlatch } from "../target/types/unlatch";

describe("unlatch", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.unlatch as Program<Unlatch>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
