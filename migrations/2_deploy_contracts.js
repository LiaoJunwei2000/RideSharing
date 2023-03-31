const User = artifacts.require("User");
const RideSharing = artifacts.require("RideSharing");
const Ride = artifacts.require("Ride");

module.exports = async function (deployer) {
  await deployer.deploy(User);
  await deployer.deploy(Ride);
  await deployer.deploy(RideSharing, User.address, Ride.address);
};
