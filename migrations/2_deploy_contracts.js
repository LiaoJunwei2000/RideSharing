const ERC20 = artifacts.require("ERC20");
const RNG = artifacts.require("RNG");
const DiceToken = artifacts.require("DiceToken");
const Dice = artifacts.require("Dice");
const DiceCasino = artifacts.require("DiceCasino");

module.exports = (deployer, network, accounts) => {
  deployer
    .deploy(DiceToken)
    .then(function () {
      return deployer.deploy(RNG);
    })
    .then(function () {
      return deployer.deploy(Dice, DiceToken.address,RNG.address);
    })
    .then(function () {
      return deployer.deploy(DiceCasino, Dice.address, DiceToken.address);
    });
};
