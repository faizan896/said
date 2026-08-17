import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { Said } from "../typechain-types";

const DAY = 24 * 60 * 60;

async function deploySaid() {
  const [creator, witness1, witness2, witness3, stranger] = await ethers.getSigners();
  const Said = await ethers.getContractFactory("Said");
  const said = (await Said.deploy()) as unknown as Said;
  await said.waitForDeployment();
  return { said, creator, witness1, witness2, witness3, stranger };
}

async function futureDeadline(daysFromNow: number) {
  const now = await time.latest();
  return now + daysFromNow * DAY;
}

describe("Said", () => {
  describe("createPromise", () => {
    it("creates a promise with the expected fields and Active status", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);

      await said.createPromise("I'll ship the MVP", deadline);

      const p = await said.getPromise(1);
      expect(p.id).to.equal(1);
      expect(p.creator).to.equal(creator.address);
      expect(p.statement).to.equal("I'll ship the MVP");
      expect(p.deadline).to.equal(deadline);
      expect(p.status).to.equal(0); // Active
      expect(p.completedAt).to.equal(0);
      expect(p.proofURI).to.equal("");
    });

    it("increments ids across multiple promises, including across different creators", async () => {
      const { said, creator, witness1 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);

      await said.createPromise("first", deadline);
      await said.connect(witness1).createPromise("second", deadline);

      expect((await said.getPromise(1)).creator).to.equal(creator.address);
      expect((await said.getPromise(2)).creator).to.equal(witness1.address);
      expect(await said.nextId()).to.equal(3);
    });

    it("reverts on an empty statement", async () => {
      const { said } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await expect(said.createPromise("", deadline)).to.be.revertedWithCustomError(
        said,
        "EmptyStatement"
      );
    });

    it("reverts when the statement exceeds MAX_STATEMENT_LENGTH", async () => {
      const { said } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      const tooLong = "a".repeat(281);
      await expect(said.createPromise(tooLong, deadline)).to.be.revertedWithCustomError(
        said,
        "StatementTooLong"
      );
    });

    it("accepts a statement at exactly MAX_STATEMENT_LENGTH", async () => {
      const { said } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      const maxLen = "a".repeat(280);
      await expect(said.createPromise(maxLen, deadline)).to.not.be.reverted;
    });

    it("reverts when the deadline is in the past", async () => {
      const { said } = await loadFixture(deploySaid);
      const past = (await time.latest()) - DAY;
      await expect(said.createPromise("late", past)).to.be.revertedWithCustomError(
        said,
        "DeadlineNotInFuture"
      );
    });

    it("reverts when the deadline equals the current block timestamp", async () => {
      const { said } = await loadFixture(deploySaid);
      const now = (await time.latest()) + 1;
      // mine to that exact second so block.timestamp === deadline
      await time.setNextBlockTimestamp(now);
      await expect(said.createPromise("now", now)).to.be.revertedWithCustomError(
        said,
        "DeadlineNotInFuture"
      );
    });

    it("reverts when the deadline is further out than MAX_DEADLINE_WINDOW", async () => {
      const { said } = await loadFixture(deploySaid);
      const farFuture = await futureDeadline(3651);
      await expect(said.createPromise("too far", farFuture)).to.be.revertedWithCustomError(
        said,
        "DeadlineTooFar"
      );
    });

    it("emits PromiseCreated with correct args", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(7);

      const tx = await said.createPromise("emit me", deadline);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(said, "PromiseCreated")
        .withArgs(1, creator.address, "emit me", block!.timestamp, deadline);
    });
  });

  describe("witnessPromise", () => {
    it("allows another wallet to witness a promise", async () => {
      const { said, witness1 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("witness me", deadline);

      await said.connect(witness1).witnessPromise(1);

      expect(await said.hasWitnessed(1, witness1.address)).to.equal(true);
      expect(await said.witnessCount(1)).to.equal(1);
    });

    it("tracks multiple distinct witnesses and returns them via getWitnesses", async () => {
      const { said, witness1, witness2, witness3 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("popular promise", deadline);

      await said.connect(witness1).witnessPromise(1);
      await said.connect(witness2).witnessPromise(1);
      await said.connect(witness3).witnessPromise(1);

      expect(await said.witnessCount(1)).to.equal(3);
      const page = await said.getWitnesses(1, 0, 10);
      expect(page).to.deep.equal([witness1.address, witness2.address, witness3.address]);
    });

    it("paginates getWitnesses correctly", async () => {
      const { said, witness1, witness2, witness3 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("paginate me", deadline);
      await said.connect(witness1).witnessPromise(1);
      await said.connect(witness2).witnessPromise(1);
      await said.connect(witness3).witnessPromise(1);

      const firstPage = await said.getWitnesses(1, 0, 2);
      expect(firstPage).to.deep.equal([witness1.address, witness2.address]);

      const secondPage = await said.getWitnesses(1, 2, 2);
      expect(secondPage).to.deep.equal([witness3.address]);

      const outOfRange = await said.getWitnesses(1, 10, 2);
      expect(outOfRange).to.deep.equal([]);
    });

    it("reverts on duplicate witnessing by the same wallet", async () => {
      const { said, witness1 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("no double witnessing", deadline);

      await said.connect(witness1).witnessPromise(1);
      await expect(said.connect(witness1).witnessPromise(1)).to.be.revertedWithCustomError(
        said,
        "AlreadyWitnessed"
      );
    });

    it("reverts when the creator tries to witness their own promise", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("self witness", deadline);

      await expect(said.connect(creator).witnessPromise(1)).to.be.revertedWithCustomError(
        said,
        "CannotWitnessOwnPromise"
      );
    });

    it("reverts when witnessing a nonexistent promise", async () => {
      const { said, witness1 } = await loadFixture(deploySaid);
      await expect(said.connect(witness1).witnessPromise(999)).to.be.revertedWithCustomError(
        said,
        "PromiseNotFound"
      );
    });

    it("allows witnessing a promise after its deadline has passed (Broken promises are still witnessable)", async () => {
      const { said, witness1 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(1);
      await said.createPromise("will break", deadline);

      await time.increase(2 * DAY);

      await expect(said.connect(witness1).witnessPromise(1)).to.not.be.reverted;
    });

    it("emits PromiseWitnessed with an incrementing witness count", async () => {
      const { said, witness1, witness2 } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("emit witness", deadline);

      const tx1 = await said.connect(witness1).witnessPromise(1);
      const receipt1 = await tx1.wait();
      const block1 = await ethers.provider.getBlock(receipt1!.blockNumber);
      await expect(tx1)
        .to.emit(said, "PromiseWitnessed")
        .withArgs(1, witness1.address, 1, block1!.timestamp);

      const tx2 = await said.connect(witness2).witnessPromise(1);
      const receipt2 = await tx2.wait();
      const block2 = await ethers.provider.getBlock(receipt2!.blockNumber);
      await expect(tx2)
        .to.emit(said, "PromiseWitnessed")
        .withArgs(1, witness2.address, 2, block2!.timestamp);
    });
  });

  describe("completePromise", () => {
    it("allows the creator to mark an active promise as Kept", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("I'll do it", deadline);

      await said.connect(creator).completePromise(1, "https://proof.example/done");

      const p = await said.getPromise(1);
      expect(p.status).to.equal(1); // Kept
      expect(p.proofURI).to.equal("https://proof.example/done");
      expect(p.completedAt).to.be.gt(0);
    });

    it("allows completing with an empty proof (proof is optional)", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("no proof needed", deadline);

      await expect(said.connect(creator).completePromise(1, "")).to.not.be.reverted;
      expect((await said.getPromise(1)).status).to.equal(1);
    });

    it("reverts when a non-creator tries to complete the promise", async () => {
      const { said, creator, stranger } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("mine only", deadline);

      await expect(
        said.connect(stranger).completePromise(1, "")
      ).to.be.revertedWithCustomError(said, "NotPromiseCreator");
    });

    it("reverts when completing a promise that is already Kept", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("once only", deadline);
      await said.connect(creator).completePromise(1, "done");

      await expect(
        said.connect(creator).completePromise(1, "again")
      ).to.be.revertedWithCustomError(said, "PromiseNotActive");
    });

    it("reverts when completing after the deadline has passed (Broken, derived)", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(1);
      await said.createPromise("too late", deadline);

      await time.increase(2 * DAY);

      await expect(
        said.connect(creator).completePromise(1, "sorry, late")
      ).to.be.revertedWithCustomError(said, "PromiseNotActive");
    });

    it("reverts when completing a nonexistent promise", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      await expect(
        said.connect(creator).completePromise(999, "")
      ).to.be.revertedWithCustomError(said, "PromiseNotFound");
    });

    it("reverts when the proof exceeds MAX_PROOF_LENGTH", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("proof limit", deadline);

      const tooLong = "a".repeat(513);
      await expect(
        said.connect(creator).completePromise(1, tooLong)
      ).to.be.revertedWithCustomError(said, "ProofTooLong");
    });

    it("emits PromiseCompleted with correct args", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(30);
      await said.createPromise("emit complete", deadline);

      const tx = await said.connect(creator).completePromise(1, "proof-uri");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(said, "PromiseCompleted")
        .withArgs(1, creator.address, "proof-uri", block!.timestamp);
    });
  });

  describe("status derivation", () => {
    it("reads as Active before the deadline", async () => {
      const { said } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(5);
      await said.createPromise("still time", deadline);
      expect((await said.getPromise(1)).status).to.equal(0);
    });

    it("reads as Broken once the deadline has passed without completion, without any transaction", async () => {
      const { said } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(1);
      await said.createPromise("will break", deadline);

      await time.increase(2 * DAY);

      // purely a view call — no state-changing tx needed for status to flip
      expect((await said.getPromise(1)).status).to.equal(2); // Broken
    });

    it("reads as Kept even after the deadline, if completed in time", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(2);
      await said.createPromise("kept early", deadline);
      await said.connect(creator).completePromise(1, "done early");

      await time.increase(5 * DAY);

      expect((await said.getPromise(1)).status).to.equal(1); // still Kept
    });

    it("never persists Broken in storage — completing right at the deadline boundary still works", async () => {
      const { said, creator } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(1);
      await said.createPromise("boundary", deadline);

      await time.setNextBlockTimestamp(deadline); // exactly at deadline, not yet past it
      await expect(said.connect(creator).completePromise(1, "just in time")).to.not.be
        .reverted;
      expect((await said.getPromise(1)).status).to.equal(1);
    });
  });

  describe("view helpers", () => {
    it("reverts getPromise for a nonexistent id", async () => {
      const { said } = await loadFixture(deploySaid);
      await expect(said.getPromise(42)).to.be.revertedWithCustomError(said, "PromiseNotFound");
    });

    it("hasWitnessed returns false for a wallet that hasn't witnessed", async () => {
      const { said, witness1, stranger } = await loadFixture(deploySaid);
      const deadline = await futureDeadline(10);
      await said.createPromise("check", deadline);
      await said.connect(witness1).witnessPromise(1);

      expect(await said.hasWitnessed(1, stranger.address)).to.equal(false);
    });

    it("nextId starts at 1 and reflects total promises created", async () => {
      const { said } = await loadFixture(deploySaid);
      expect(await said.nextId()).to.equal(1);
      const deadline = await futureDeadline(10);
      await said.createPromise("a", deadline);
      await said.createPromise("b", deadline);
      expect(await said.nextId()).to.equal(3);
    });
  });
});
