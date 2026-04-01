/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/condition_oracle.json`.
 */
export type ConditionOracle = {
  "address": "3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG",
  "metadata": {
    "name": "conditionOracle",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initializeCondition",
      "discriminator": [
        210,
        55,
        126,
        97,
        178,
        72,
        14,
        59
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowState",
          "docs": [
            "we only store its pubkey — no deserialization needed here."
          ]
        },
        {
          "name": "conditionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  100,
                  105,
                  116,
                  105,
                  111,
                  110
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
          "name": "releaseAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  108,
                  101,
                  97,
                  115,
                  101
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
          "name": "params",
          "type": {
            "defined": {
              "name": "initConditionParams"
            }
          }
        }
      ]
    },
    {
      "name": "setResolved",
      "discriminator": [
        244,
        50,
        28,
        94,
        112,
        203,
        66,
        178
      ],
      "accounts": [
        {
          "name": "resolveAuthority",
          "signer": true
        },
        {
          "name": "conditionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  100,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "condition_config.escrow_state",
                "account": "conditionConfig"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "tryRelease",
      "discriminator": [
        157,
        79,
        136,
        120,
        48,
        191,
        205,
        90
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "conditionConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  100,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "condition_config.escrow_state",
                "account": "conditionConfig"
              }
            ]
          }
        },
        {
          "name": "releaseAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  108,
                  101,
                  97,
                  115,
                  101
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
          "name": "escrowCoreProgram"
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
      "name": "conditionConfig",
      "discriminator": [
        60,
        54,
        114,
        138,
        187,
        53,
        152,
        216
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTimestamp",
      "msg": "Target timestamp must be in the future"
    },
    {
      "code": 6001,
      "name": "conditionNotMet",
      "msg": "Condition has not been met"
    },
    {
      "code": 6002,
      "name": "alreadyResolved",
      "msg": "Condition already resolved"
    },
    {
      "code": 6003,
      "name": "unauthorizedResolver",
      "msg": "Caller is not authorized to resolve"
    }
  ],
  "types": [
    {
      "name": "conditionConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrowState",
            "docs": [
              "which escrow_state this condition is linked to"
            ],
            "type": "pubkey"
          },
          {
            "name": "conditionType",
            "docs": [
              "the type of condition being checked"
            ],
            "type": {
              "defined": {
                "name": "conditionType"
              }
            }
          },
          {
            "name": "targetTimestamp",
            "docs": [
              "used by TimestampAfter — unix timestamp to unlock after"
            ],
            "type": "i64"
          },
          {
            "name": "resolved",
            "docs": [
              "used by ManualBool — flipped to true by resolve_authority"
            ],
            "type": "bool"
          },
          {
            "name": "resolveAuthority",
            "docs": [
              "who is allowed to call set_resolved (only used for ManualBool)"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "bump for ConditionConfig PDA",
              "seeds = [b\"condition\", escrow_state.key()]"
            ],
            "type": "u8"
          },
          {
            "name": "releaseBump",
            "docs": [
              "bump for release_authority PDA",
              "seeds = [b\"release\", condition_config.key()]",
              "this address is what gets stored in EscrowState.release_authority"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "conditionType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "timestampAfter"
          },
          {
            "name": "manualBool"
          }
        ]
      }
    },
    {
      "name": "initConditionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "conditionType",
            "type": {
              "defined": {
                "name": "conditionType"
              }
            }
          },
          {
            "name": "targetTimestamp",
            "type": "i64"
          },
          {
            "name": "resolveAuthority",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
