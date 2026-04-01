/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow_core.json`.
 */
export type EscrowCore = {
  "address": "3BXJUR36foqaXawy5dQCPx1amq5yPzQSfPygjx4GSk3s",
  "metadata": {
    "name": "escrowCore",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "escrowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "vault is a token account owned by the escrow_state PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "depositorAta",
          "docs": [
            "depositor's token account for this mint"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "releaseAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "release",
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "releaseAuthority",
          "docs": [
            "this is the oracle's PDA — it must be a signer",
            "no human wallet should ever be able to satisfy this"
          ]
        },
        {
          "name": "escrowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow_state.depositor",
                "account": "escrowState"
              },
              {
                "kind": "account",
                "path": "escrow_state.mint",
                "account": "escrowState"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "escrowState"
              }
            ]
          }
        },
        {
          "name": "depositorAta",
          "docs": [
            "depositor's ATA receives the funds back"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrowState",
      "discriminator": [
        19,
        90,
        148,
        111,
        55,
        130,
        229,
        108
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedCaller",
      "msg": "caller is not the stored release_authority"
    },
    {
      "code": 6001,
      "name": "alreadyReleased",
      "msg": "escrow has already been released"
    },
    {
      "code": 6002,
      "name": "conditionNotMet",
      "msg": "on-chain condition has not been met"
    },
    {
      "code": 6003,
      "name": "policyViolation",
      "msg": "policy violation — spending limit or chain restriction"
    },
    {
      "code": 6004,
      "name": "invalidSeeds",
      "msg": "PDA seeds do not match expected derivation"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "deposit amount must be greater than zero"
    }
  ],
  "types": [
    {
      "name": "escrowState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "releaseAuthority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "isReleased",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
