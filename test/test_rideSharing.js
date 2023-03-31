const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions"); // npm truffle-assertions
const BigNumber = require("bignumber.js"); // npm install bignumber.js
var assert = require("assert");

const User = artifacts.require("User");
const RideSharing = artifacts.require("RideSharing");
const Ride = artifacts.require("Ride");

contract("RideSharing", (accounts) => {
  let userContract;
  let rideSharingContract;
  let rideContract;
  const rider = accounts[1];
  const driver = accounts[2];

  before(async () => {
    userContract = await User.new();
    rideSharingContract = await RideSharing.new(userContract.address);
    rideContract = await Ride.new();

    await userContract.registerUser(
      "Rider Name",
      "rider@example.com",
      false,
      "",
      "",
      { from: rider }
    );
    await userContract.registerUser(
      "Driver Name",
      "driver@example.com",
      true,
      "Tesla Model S",
      "AB123CD",
      { from: driver }
    );
  });

  it("should create a new ride", async () => {
    const fare = 100;
    const startLat = 12345678;
    const startLong = 23456789;
    const endLat = 34567890;
    const endLong = 45678901;

    await rideSharingContract.createRide(
      rideContract.address,
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );

    const rideIndex = await rideSharingContract.getRideIndex(0);
    const rideDetails = await rideContract.getRideDetails(rideIndex);

    assert.equal(rideDetails.rider, rider, "Rider address should match.");
    assert.equal(rideDetails.fare, fare, "Fare should match.");
    assert.equal(
      rideDetails.startLat,
      startLat,
      "Start latitude should match."
    );
    assert.equal(
      rideDetails.startLong,
      startLong,
      "Start longitude should match."
    );
    assert.equal(rideDetails.endLat, endLat, "End latitude should match.");
    assert.equal(rideDetails.endLong, endLong, "End longitude should match.");
  });

  it("should allow a driver to accept a ride", async () => {
    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.acceptRide(rideContract.address, rideIndex, {
      from: driver,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.driver, driver, "Driver address should match.");
  });

  it("should complete a ride", async () => {
    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.completeRide(rideContract.address, rideIndex, {
      from: rider,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.isCompleted, true, "Ride should be completed.");
  });
});
