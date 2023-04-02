const User = artifacts.require("User");
const RideSharing = artifacts.require("RideSharing");
const Ride = artifacts.require("Ride");
const RideToken = artifacts.require("RideToken");

module.exports = async function (deployer) {
  await deployer.deploy(User);
  await deployer.deploy(Ride);
  await deployer.deploy(RideToken);
  await deployer.deploy(RideSharing, RideToken.address, User.address, Ride.address);
};
