Unlatch - Programmable Escrow with Conditions & Multisig

Unlatch is a modular, composable smart contract system on Solana that enables programmable escrow flows.

It allows funds to be locked and released based on:

Time-based conditions
Arbitrary logic (oracles, APIs, future ZK proofs)
Multisig approvals (2-of-3, N-of-M, etc.)

Core Idea - 

Traditional escrow is binary: lock → release

Unlatch turns it into: lock → condition → guard → release

Architecture - 
User → Multisig Guard → Condition Oracle → Escrow Core → Token Transfer

1. Escrow Core
Holds tokens securely in a PDA vault
Stores: depositor , mint , release authority
Handles: deposit , release

No logic just safe custody

2. Condition Oracle
Determines when funds can be released
Supports: timestamp conditions and manual resolution (admin / API / automation)

Can be extended to:
price feeds (Pyth, Switchboard)
off-chain APIs
ZK proofs

 3. Multisig Guard
Adds human consensus layer
Supports: N-of-M approvals
Prevents: unilateral release and malicious oracle triggers

Execution Flow

Create condition
Deposit into escrow
Attach multisig guard
Collect approvals
Execute release

Final execution (3-hop CPI)
guard.execute()
 → oracle.try_release()
   → escrow.release()
   
Project Structure
programs/
  escrow-core/        → token custody
  condition-oracle/   → release logic
  multisig-guard/     → approval layer

sdk/
  src/                → TS client for all programs

tests/
  → full integration tests

examples/
  full-flow.ts        → real devnet execution
  
Setup
1. Install dependencies - yarn install
2. Install Solana + Anchor
3. Build programs - anchor build
4. Run tests - anchor test
   
Run Full Flow (Devnet)
ts-node examples/full-flow.ts

Wallet Setup

Uses your local Solana wallet: ~/.config/solana/id.json

Example Use Cases
Real Estate Escrow
Funds released after legal verification + multisig approval

Freelance Payments
Client locks funds
Released after milestone + approvals

DAO Treasury
Funds released after: proposal passes and multisig confirms

API-triggered Payments
Example: “Release funds if shipment delivered”

Security Model
Layer	Responsibility
Escrow Core	funds safety
Oracle	condition validation
Guard	human consensus

Defense-in-depth
PDA-based vaults
Explicit authority separation
Multi-program isolation
CPI-controlled execution

Testing

Includes:

deposit correctness
unauthorized release rejection
multisig approval logic
full 3-hop CPI execution

SDK Located in: sdk/src/
Provides:

createEscrow()
plugCondition()
attachGuard()
approve()
execute()

Example (SDK)

await createEscrow({...});
await plugCondition({...});
await attachGuard({...});
await approve({...});
await execute({...});

Future Roadmap
Price oracle integration (Pyth / Switchboard)
API-based conditions
On-chain condition registry
ZK condition proofs
Token streaming support
Frontend dashboard
Contributing



programmable money with conditions + consensus

Not just “lock funds”, but:

👉 “define exactly when and how they unlock”
