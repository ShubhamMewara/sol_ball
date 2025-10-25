import { clusterApiUrl, Connection } from "@solana/web3.js";
import { before, describe, it } from "node:test";

describe("init", async () => {
  let connection: Connection;
  before(async () => {
    connection = new Connection(clusterApiUrl("devnet"), {
      commitment: "confirmed",
    });
  });

  it("testing init bank", () => {});
  it("deposit", () => {});
  it("withdraw", () => {});
  it("join_match", () => {});
  it("settle_match", () => {});
  it("transfer admins cut", () => {});
});
