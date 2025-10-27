import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { describe } from "mocha";
import type { Solball } from "../target/types/solball";

describe("init", async () => {
  const connection = new Connection(clusterApiUrl("devnet"));
  const anchorProvider = anchor.AnchorProvider.local(clusterApiUrl("devnet"));
  const wallet = anchorProvider.wallet;
  anchor.setProvider(anchorProvider);
  console.log("Yo");
  // Get the program
  const program = anchor.workspace.Solball as anchor.Program<Solball>;

  // it("testing init bank", async function (this) {
  //   this.timeout(100000);
  //   console.log("Initializing of bank..");
  //   const ix = await program.methods.initBank().rpc();
  //   console.log(`Your Transaction Sig`, ix);
  // });

  it("deposit", async function () {
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
