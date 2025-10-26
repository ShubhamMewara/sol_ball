import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { describe, it } from "node:test";
import { Solball } from "../target/types/solball";

const IDL = {
  address: "9DhotU5ZdWaWhuyBTAJUvLedGaEeKn38hG83aneBapQv",
  metadata: {
    name: "solball",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "deposit",
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
      accounts: [
        {
          name: "signer",
          writable: true,
          signer: true,
        },
        {
          name: "user_sub_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  117, 115, 101, 114, 95, 115, 117, 98, 95, 97, 99, 99, 111,
                  117, 110, 116,
                ],
              },
              {
                kind: "account",
                path: "signer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
        },
      ],
    },
    {
      name: "init_bank",
      discriminator: [73, 111, 27, 243, 202, 129, 159, 80],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "bank_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "join_match",
      discriminator: [244, 8, 47, 130, 192, 59, 179, 44],
      accounts: [
        {
          name: "signer",
          writable: true,
          signer: true,
        },
        {
          name: "bank_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "entry_fee",
          type: "u64",
        },
      ],
    },
    {
      name: "settle_match",
      discriminator: [71, 124, 117, 96, 191, 217, 116, 24],
      accounts: [
        {
          name: "signer",
          writable: true,
          signer: true,
        },
        {
          name: "user_sub_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  117, 115, 101, 114, 95, 115, 117, 98, 95, 97, 99, 99, 111,
                  117, 110, 116,
                ],
              },
              {
                kind: "account",
                path: "signer",
              },
            ],
          },
        },
        {
          name: "bank_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 97, 110, 107, 95, 97, 99, 99, 111, 117, 110, 116],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "winner_share",
          type: "u64",
        },
      ],
    },
    {
      name: "withdraw",
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
      accounts: [
        {
          name: "signer",
          writable: true,
          signer: true,
        },
        {
          name: "user_sub_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  117, 115, 101, 114, 95, 115, 117, 98, 95, 97, 99, 99, 111,
                  117, 110, 116,
                ],
              },
              {
                kind: "account",
                path: "signer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "lamports",
          type: "u64",
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "CustomError",
      msg: "Custom error message",
    },
    {
      code: 6001,
      name: "InvalidSubAccount",
      msg: "Account Derivation not valid",
    },
  ],
  constants: [
    {
      name: "SEED",
      type: "string",
      value: '"anchor"',
    },
  ],
};

describe("init", async () => {
  const provider = anchor.AnchorProvider.local(clusterApiUrl("devnet"));
  const wallet = provider.wallet;
  anchor.setProvider(provider);
  const programId = new PublicKey(
    "4ddavkocvoin1ZTeJcHrgtZHjN3ETEhwPh3jWE26qV7U"
  );
  console.log(provider.publicKey.toString());
  const program = new anchor.Program(IDL, provider);
  console.log(program.programId);
  // it("testing init bank", async () => {
  //   console.log("Initializing of bank..");
  //   const ix = await program.methods.initBank().rpc();

  //   console.log(`Your Transaction Sig`, ix);
  // });

  it("deposit", async () => {
    console.log("Lets deposit Sol Now");
    const ix = await program.methods.deposit(new BN(10)).rpc();
    console.log(`Tx Sig`, ix);
  });

  // it("withdraw", async () => {
  //   console.log("Lets deposit before withdraw");
  //   const ix = await program.methods.deposit(new BN(200)).simulate();

  //   console.log("Lets try to withdraw that now");
  //   const ix2 = await program.methods.withdraw(new BN(100)).simulate();
  //   console.log("Cool");
  //   console.log(`Tx Sig`, ix);
  //   console.log(`Tx Sig`, ix2);
  // });

  // it("join_match", async () => {
  //   const program: Program<Solball> = new Program(IDL, { connection });
  //   const ix = await program.methods
  //     .joinMatch(new BN(LAMPORTS_PER_SOL))
  //     .instruction();

  //   const bx = await connection.getLatestBlockhash();
  //   const tx = new Transaction({
  //     blockhash: bx.blockhash,
  //     lastValidBlockHeight: bx.lastValidBlockHeight,
  //   }).add(ix);

  //   const txSig = connection.simulateTransaction(tx);
  //   console.log(`Tx Sig`, txSig);
  // });

  // it("settle_match", async () => {
  //   const program: Program<Solball> = new Program(IDL, { connection });
  //   const ix = await program.methods
  //     .settleMatch(new BN(LAMPORTS_PER_SOL))
  //     .instruction();

  //   const bx = await connection.getLatestBlockhash();
  //   const tx = new Transaction({
  //     blockhash: bx.blockhash,
  //     lastValidBlockHeight: bx.lastValidBlockHeight,
  //   }).add(ix);

  //   const txSig = connection.simulateTransaction(tx);
  //   console.log(`Tx Sig`, txSig);
  // });
  // it("transfer admins cut", async () => {});
});
