/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/multisig_guard.json`.
 */
export type MultisigGuard = {
  "address": "BweWEmsS5txchdCRTgPLi31UNeS19rf4DpQnTDsubVLY",
  "metadata": {
    "name": "multisigGuard",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "approve",
      "discriminator": [
        69,
        74,
        217,
        36,
        115,
        117,
        97,
        76
      ],
      "accounts": [
        {
          "name": "approver",
          "signer": true
        },
        {
          "name": "guardState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "guard_state.condition_config",
                "account": "guardState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "execute",
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "cranker",
          "docs": [
            "cranker pays tx fee — anyone can call this once threshold is met"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "guardState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "guard_state.condition_config",
                "account": "guardState"
              }
            ]
          }
        },
        {
          "name": "conditionConfig"
        },
        {
          "name": "releaseAuthority",
          "docs": [
            "seeds = [b\"release\", condition_config.key()] in oracle program"
          ]
        },
        {
          "name": "escrowState",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "depositorAta",
          "writable": true
        },
        {
          "name": "oracleProgram"
        },
        {
          "name": "escrowCoreProgram"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeGuard",
      "discriminator": [
        63,
        189,
        246,
        157,
        77,
        125,
        157,
        142
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "conditionConfig"
        },
        {
          "name": "oracleProgram"
        },
        {
          "name": "guardState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "conditionConfig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "approvedSigners",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "requiredApprovals",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "guardState",
      "discriminator": [
        23,
        232,
        95,
        177,
        15,
        220,
        133,
        0
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAnApprover",
      "msg": "signer is not in the approved_signers list"
    },
    {
      "code": 6001,
      "name": "alreadyApproved",
      "msg": "this signer has already approved"
    },
    {
      "code": 6002,
      "name": "insufficientApprovals",
      "msg": "not enough approvals collected yet"
    },
    {
      "code": 6003,
      "name": "alreadyExecuted",
      "msg": "guard has already been executed"
    },
    {
      "code": 6004,
      "name": "emptySignersList",
      "msg": "approved_signers list cannot be empty"
    },
    {
      "code": 6005,
      "name": "invalidThreshold",
      "msg": "required_approvals cannot exceed number of signers"
    },
    {
      "code": 6006,
      "name": "tooManySigners",
      "msg": "too many signers — max is 10"
    }
  ],
  "types": [
    {
      "name": "guardState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "conditionConfig",
            "docs": [
              "the condition_config this guard wraps"
            ],
            "type": "pubkey"
          },
          {
            "name": "oracleProgram",
            "docs": [
              "the oracle program that owns condition_config"
            ],
            "type": "pubkey"
          },
          {
            "name": "requiredApprovals",
            "docs": [
              "how many approvals are needed before execute fires"
            ],
            "type": "u8"
          },
          {
            "name": "approvalsCollected",
            "docs": [
              "how many have been collected so far"
            ],
            "type": "u8"
          },
          {
            "name": "approvedSigners",
            "docs": [
              "list of pubkeys that are valid approvers",
              "max 10 approvers"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "approvedBy",
            "docs": [
              "list of pubkeys that have already approved",
              "used to prevent duplicate votes"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "isExecuted",
            "docs": [
              "whether execute has already been called"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "bump for GuardState PDA",
              "seeds = [b\"guard\", condition_config.key()]"
            ],
            "type": "u8"
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
