/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solball.json`.
 */
export type Solball = {
  address: "4ddavkocvoin1ZTeJcHrgtZHjN3ETEhwPh3jWE26qV7U";
  metadata: {
    name: "solball";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "deposit";
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "userSubAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  117,
                  98,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "signer";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        }
      ];
    },
    {
      name: "initBank";
      discriminator: [73, 111, 27, 243, 202, 129, 159, 80];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "bankAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "joinMatch";
      discriminator: [244, 8, 47, 130, 192, 59, 179, 44];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "bankAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "entryFee";
          type: "u64";
        }
      ];
    },
    {
      name: "settleMatch";
      discriminator: [71, 124, 117, 96, 191, 217, 116, 24];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "userSubAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  117,
                  98,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "signer";
              }
            ];
          };
        },
        {
          name: "bankAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "winnerShare";
          type: "u64";
        }
      ];
    },
    {
      name: "withdraw";
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "userSubAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  117,
                  98,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "signer";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "customError";
      msg: "Custom error message";
    },
    {
      code: 6001;
      name: "invalidSubAccount";
      msg: "Account Derivation not valid";
    }
  ];
  constants: [
    {
      name: "seed";
      type: "string";
      value: '"anchor"';
    }
  ];
};
