# Unlatch

Every escrow on Solana is monolithic. The vault, the release condition, 
and the approval logic are all fused into one program. Want to change 
the condition? Redeploy everything. Want M-of-N approval before the 
condition fires? Write it from scratch and wire it in yourself.

Unlatch splits these into three separate programs that compose via CPI.

## The problem

When you build an escrow on Solana today, you make a choice:

**Option A** — trust a multisig of humans to manually release funds. 
Someone has to be online. Social coordination is required. Nothing 
is automatic.

**Option B** — hardcode the release condition into the escrow program 
itself. Works until requirements change. Then you redeploy, migrate 
state, and hope nothing breaks.

Neither option lets you swap the condition without touching the vault. 
Neither lets you add an approval layer without rewriting the core logic.

## How Unlatch works

Three programs, each with one job:

**escrow-core** holds funds in a PDA vault. It has no opinion on what 
condition releases the funds. The only instruction that moves tokens 
out is `release`, and it only accepts calls from a specific address 
stored at deposit time — no human can call it directly.

**condition-oracle** evaluates a condition (a timestamp, a boolean 
flag, or anything else you plug in). If the condition passes, it CPIs 
into escrow-core's release instruction using a PDA as the signer. 
escrow-core sees a valid signer from the right address and releases.

**multisig-guard** sits in front of the oracle. It collects M-of-N 
approvals from a list of authorized signers. Once the threshold is met, 
it CPIs into condition-oracle, which CPIs into escrow-core. The full 
chain: guard → oracle → escrow-core.

The guard is optional. You can run escrow-core + condition-oracle alone. 
You can add the guard on top without changing either of the other two 
programs.

## The key insight

The programs don't know about each other's internals. escrow-core stores 
one pubkey — the release_authority — and rejects anything that doesn't 
match. condition-oracle derives that pubkey as a PDA from its own 
condition account and signs with it via invoke_signed. No shared state. 
No shared imports. Just a PDA address stored in one program and derived 
in another.

This is what makes it composable. The vault is a dumb primitive. The 
condition is a plugin. The guard is optional middleware.

## Programs

All three are deployed on Solana devnet.

| Program | Address |
|---|---|
| escrow-core | `3BXJUR36foqaXawy5dQCPx1amq5yPzQSfPygjx4GSk3s` |
| condition-oracle | `3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG` |
| multisig-guard | `BweWEmsS5txchdCRTgPLi31UNeS19rf4DpQnTDsubVLY` |

## SDK

import {
  plugCondition,
  createEscrow,
  attachGuard,
  approve,
  execute,
} from "@unlatch/sdk";

// initialize condition first — returns the release_authority address
const { conditionConfig, releaseAuthority } = await plugCondition({
  connection, wallet,
  escrowState: pdas.escrowState.address,
  condition: { type: "timestamp", targetTimestamp: unlockTime },
});

// deposit — vault is now locked until condition fires
const { escrowState, vault } = await createEscrow({
  connection, wallet, mint,
  amount: 1_000_000n,
  releaseAuthority,
});

// optional — add M-of-N approval gate
const { guardState } = await attachGuard({
  connection, wallet, conditionConfig,
  approvers: [signer1.publicKey, signer2.publicKey, signer3.publicKey],
  requiredApprovals: 2,
});

// collect approvals
await approve({ connection, wallet, approver: signer1, guardState });
await approve({ connection, wallet, approver: signer2, guardState });

// fire — guard → oracle → escrow-core
await execute({ connection, wallet, guardState, conditionConfig,
  releaseAuthority, escrowState, vault, depositorAta, mint });


## PDA scheme

escrow_state  — seeds: ["escrow", depositor, mint]        — escrow-core
vault         — seeds: ["vault", escrow_state]             — escrow-core
condition     — seeds: ["condition", escrow_state]         — condition-oracle
release_auth  — seeds: ["release", condition_config]       — condition-oracle
guard         — seeds: ["guard", condition_config]         — multisig-guard


The release_authority PDA is the link between programs. condition-oracle 
derives it from its own account and signs with it. escrow-core checks 
it against the address stored at deposit time. They never share code — 
only a public key.

## Devnet transaction

3-hop CPI chain (guard → oracle → escrow-core): `[your tx signature]`

## Running locally

anchor build
anchor test

cd sdk && npm run build
node examples/full-flow.ts


## Adding a custom condition

Create a new variant in condition-oracle's `ConditionType` enum. 
Implement the check in `try_release.rs` inside the match block. 
Redeploy condition-oracle. escrow-core and multisig-guard need no changes.

## License

MIT
