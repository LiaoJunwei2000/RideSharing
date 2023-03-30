const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions"); // npm truffle-assertions
const BigNumber = require("bignumber.js"); // npm install bignumber.js
var assert = require("assert");

var DiceToken = artifacts.require("../contracts/DiceToken.sol");
var RNG = artifacts.require("../contracts/RNG.sol");
var Dice = artifacts.require("../contracts/Dice.sol");
var DiceCasino = artifacts.require("../contracts/DiceCasino.sol");

const oneEth = new BigNumber(1000000000000000000); // 1 eth
// =============================     Useful concepts       =============================:
// To get the Eth Account Balance = new BigNumber(await web3.eth.getBalance(accounts[1]));
// Get Latest Dice ID => (await diceInstance.getLatestDiceId()).toNumber() => becomes 1,2,3...
// Calculations with bignumer.js: oneEth.dividedBy(2), oneEth.multipliedBy(10) etc..
// Address of contracts in truffle can be obtain with: diceCasinoInstance.address
// =============================     Useful concepts       =============================:

contract("Casino", function (accounts) {
  before(async () => {
    diceTokenInstance = await DiceToken.deployed();
    rngInstance = await RNG.deployed();
    diceInstance = await Dice.deployed();
    diceCasinoInstance = await DiceCasino.deployed();
  });

  console.log("Testing DiceCasino contract");

  it("Get DiceToken", async () => {
    await diceCasinoInstance.getDT({
      from: accounts[1],
      value: oneEth.dividedBy(2),
    }); // .5 eth gets 50 DT

    await diceCasinoInstance.getDT({
      from: accounts[2],
      value: oneEth,
    }); // 1 eth gets 100 DT

    const amt1 = new BigNumber(
      await diceCasinoInstance.checkDT({ from: accounts[1] })
    );
    const amt2 = new BigNumber(
      await diceCasinoInstance.checkDT({ from: accounts[2] })
    );

    correctAmt1 = new BigNumber(50);
    correctAmt2 = new BigNumber(100);

    await assert(amt1.isEqualTo(correctAmt1), "Incorrect DT given");
    await assert(amt2.isEqualTo(correctAmt2), "Incorrect DT given");
  });

  it("Return DiceToken", async () => {
    await diceCasinoInstance.getDT({
      from: accounts[3],
      value: oneEth.multipliedBy(10),
    });
    // Store the initial Account balances for account 3 and DiceCasino Contract
    let intialAccountBal = new BigNumber(
      await web3.eth.getBalance(accounts[3])
    );
    let intialDiceCasinoBal = new BigNumber(
      await web3.eth.getBalance(diceCasinoInstance.address)
    );
    let intialDiceCasinoDTBal = new BigNumber(
      await diceTokenInstance.checkCredit(diceCasinoInstance.address)
    );

    // 1000 DT and (9 out of 10) Eth should be returned to the account 3
    await diceCasinoInstance.returnDT({ from: accounts[3] });
    let newAccountBal = new BigNumber(await web3.eth.getBalance(accounts[3]));

    // Check that 1000 DT is returned
    let newDiceCasinoDTBal = new BigNumber(
      await diceTokenInstance.checkCredit(diceCasinoInstance.address)
    );
    await assert(
      newDiceCasinoDTBal.isEqualTo(intialDiceCasinoDTBal.plus(1000)),
      "DT was not returned to Contract"
    );
    // Check that the new account has greater ETH
    await assert(
      newAccountBal.isGreaterThan(intialAccountBal),
      "Incorrect Return Amt"
    );

    // DiceCasino Contract should have 1 eth left out of the 10 eth, losing 9 eth in the process
    let newDiceCasinoBal = new BigNumber(
      await web3.eth.getBalance(diceCasinoInstance.address)
    );
    let diceCasinoBalIncr = intialDiceCasinoBal.minus(newDiceCasinoBal);
    await assert(
      diceCasinoBalIncr.isEqualTo(oneEth.multipliedBy(9)),
      "Dice Casino was not given the correct amount of ETH"
    );

    // All DTs should be removed from the account
    const newDtAmtBN = new BigNumber(
      await diceCasinoInstance.checkDT({ from: accounts[3] })
    );
    correctnewDtAmt = new BigNumber(0);
    await assert(
      newDtAmtBN.isEqualTo(correctnewDtAmt),
      "DT amount not subtracted"
    );
  });

  it("Get Dice", async () => {
    // Store intial DT of account 1
    const account1DT = new BigNumber(
      await diceCasinoInstance.checkDT({ from: accounts[1] })
    );

    // Add Dice with 6 sides by spending 10 DT
    await diceInstance.add(6, 1, 10, { from: accounts[1] });
    let latestDiceID = (await diceInstance.getLatestDiceId()).toNumber();

    // Store the new DT balance
    const newAccount1DT = new BigNumber(
      await diceCasinoInstance.checkDT({ from: accounts[1] })
    );
    // Check if the new balance is 10DT lower than original
    await assert(
      newAccount1DT.isEqualTo(account1DT.minus(10)),
      "DT not subtracted"
    );

    // Check if the Dice was created properly
    const d1DiceSides = new BigNumber(
      await diceInstance.getDiceSides(latestDiceID)
    );
    d1CorrectDiceSides = new BigNumber(6);

    await assert(
      d1DiceSides.isEqualTo(d1CorrectDiceSides),
      "Dice not initialised properly"
    );
  });

  it("Incorrect Initiate Dice Gamble", async () => {
    await truffleAssert.reverts(
      diceCasinoInstance.initiateDiceGamble(0, 4, 10, { from: accounts[1] }),
      "Only Owner can start the Dice Gamble"
    );

    await diceInstance.transfer(0, diceCasinoInstance.address, {
      from: accounts[1],
    });

    // DiceID of 0 has 6 sides
    await truffleAssert.reverts(
      diceCasinoInstance.initiateDiceGamble(0, 6, 10, { from: accounts[1] }),
      "The target roll needs to be strictly smaller than the number of sides of the dice"
    );

    await diceCasinoInstance.initiateDiceGamble(0, 4, 10, {
      from: accounts[1],
    });

    await truffleAssert.reverts(
      diceCasinoInstance.initiateDiceGamble(0, 4, 10, { from: accounts[1] }),
      "This dice is not available"
    );
  });

  it("Incorrect Take Dice Gamble", async () => {
    await truffleAssert.reverts(
      diceCasinoInstance.takeDiceGamble(0, 5, { from: accounts[2] }),
      "More DT needed to take the gamble"
    );
    await truffleAssert.reverts(
      diceCasinoInstance.takeDiceGamble(0, 50000, { from: accounts[2] }),
      "Not enough DT balance"
    );

    await diceInstance.add(6, 1, 10, { from: accounts[2] });
    let latestDiceID = (await diceInstance.getLatestDiceId()).toNumber();

    await truffleAssert.reverts(
      diceCasinoInstance.takeDiceGamble(latestDiceID, 20, {
        from: accounts[1],
      }),
      "No gamble on this dice is initiated"
    );
  });

  it("GambleWon", async () => {
    await diceInstance.add(6, 1, 10, { from: accounts[1] });
    let latestDiceID = (await diceInstance.getLatestDiceId()).toNumber();

    await diceInstance.transfer(latestDiceID, diceCasinoInstance.address, {
      from: accounts[1],
    });

    let account1initialBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[1])
    );
    let account2initialBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[2])
    );

    await diceCasinoInstance.initiateDiceGamble(latestDiceID, 4, 10, {
      from: accounts[1],
    });
    rngInstance.setRandomNumber(5);

    let battle = await diceCasinoInstance.takeDiceGamble(latestDiceID, 11, {
      from: accounts[2],
    });

    let account1newBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[1])
    );
    let account2newBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[2])
    );

    let account1Diff = account1newBalance - account1initialBalance;
    let account2Diff = account2newBalance - account2initialBalance;

    assert.equal(account1Diff, 11);
    assert.equal(account2Diff, -11);

    truffleAssert.eventEmitted(
      battle,
      "gambleWin",
      (ev) => {
        return ev.winner == accounts[1] && ev.loser === accounts[2];
      },
      "GambleWon not working"
    );
  });

  it("GambleLost", async () => {
    await diceInstance.add(6, 1, 10, { from: accounts[1] });
    let latestDiceID = (await diceInstance.getLatestDiceId()).toNumber();

    await diceInstance.transfer(latestDiceID, diceCasinoInstance.address, {
      from: accounts[1],
    });

    await diceCasinoInstance.initiateDiceGamble(latestDiceID, 4, 10, {
      from: accounts[1],
    });
    rngInstance.setRandomNumber(3);

    let battle = await diceCasinoInstance.takeDiceGamble(latestDiceID, 11, {
      from: accounts[2],
    });
    assert(diceInstance.getOwner(latestDiceID), accounts[2]);

    truffleAssert.eventEmitted(
      battle,
      "gambleWin",
      (ev) => {
        return ev.winner == accounts[2] && ev.loser === accounts[1];
      },
      "GambleLost not working"
    );
  });

  it("GambleDrawn", async () => {
    await diceInstance.add(6, 1, 10, { from: accounts[1] });
    let latestDiceID = (await diceInstance.getLatestDiceId()).toNumber();

    await diceInstance.transfer(latestDiceID, diceCasinoInstance.address, {
      from: accounts[1],
    });

    let account1initialBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[1])
    );
    let account2initialBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[2])
    );

    await diceCasinoInstance.initiateDiceGamble(latestDiceID, 4, 10, {
      from: accounts[1],
    });
    rngInstance.setRandomNumber(4);

    let battle = await diceCasinoInstance.takeDiceGamble(latestDiceID, 11, {
      from: accounts[2],
    });

    let account1newBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[1])
    );
    let account2newBalance = new BigNumber(
      await diceTokenInstance.checkCredit(accounts[2])
    );

    assert.notStrictEqual(account1initialBalance, account1newBalance);
    assert.notStrictEqual(account2initialBalance, account2newBalance);
    truffleAssert.eventEmitted(
      battle,
      "gambleDraw",
      (ev) => {
        return ev.ad1 == accounts[1] && ev.ad2 == accounts[2];
      },
      "GambleDrawn not working"
    );
  });
});
