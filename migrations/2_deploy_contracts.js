const User = artifacts.require("User");
const RideSharing = artifacts.require("RideSharing");
const Ride = artifacts.require("Ride");

module.exports = function (deployer) {
  deployer.deploy(User).then(function () {
    return deployer.deploy(RideSharing, User.address);
  });
  deployer.deploy(Ride);
};
