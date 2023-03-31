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

  it("should return the 5 nearest available rides", async () => {
    // Register users
    await userContract.registerUser(
      "Alice",
      "alice@example.com",
      true,
      "",
      "",
      { from: accounts[0] }
    );
    await userContract.registerUser("Bob", "bob@example.com", false, "", "", {
      from: accounts[1],
    });

    await userContract.registerUser(
      "Charlie",
      "charlie@example.com",
      false,
      "",
      "",
      { from: accounts[2] }
    );
    await userContract.registerUser(
      "David",
      "david@example.com",
      false,
      "",
      "",
      { from: accounts[3] }
    );
    await userContract.registerUser(
      "Emily",
      "emily@example.com",
      false,
      "",
      "",
      { from: accounts[4] }
    );
    await userContract.registerUser("Fred", "fred@example.com", false, "", "", {
      from: accounts[5],
    });
    await userContract.registerUser(
      "George",
      "george@example.com",
      false,
      "",
      "",
      {
        from: accounts[6],
      }
    );

    // Create rides
    let ride1 = await rideSharingContract.createRide(
      rideContract.address,
      500,
      10,
      10,
      20,
      20,
      { from: accounts[1] }
    );
    let ride2 = await rideSharingContract.createRide(
      rideContract.address,
      600,
      15,
      15,
      25,
      25,
      { from: accounts[2] }
    );
    let ride3 = await rideSharingContract.createRide(
      rideContract.address,
      700,
      20,
      20,
      30,
      30,
      { from: accounts[3] }
    );
    let ride4 = await rideSharingContract.createRide(
      rideContract.address,
      800,
      30,
      30,
      40,
      40,
      { from: accounts[4] }
    );
    let ride5 = await rideSharingContract.createRide(
      rideContract.address,
      900,
      40,
      40,
      50,
      50,
      { from: accounts[5] }
    );
    let ride6 = await rideSharingContract.createRide(
      rideContract.address,
      1000,
      50,
      50,
      60,
      60,
      { from: accounts[6] }
    );

    // Get available rides for driver
    let availableRides = await rideSharingContract.getAvailableRides(0, 0, {
      from: accounts[0],
    });

    // Check if the returned rides are the 5 nearest rides
    assert.equal(availableRides.length, 5, "Should return 5 rides");
    assert.equal(
      availableRides[0],
      ride1.logs[0].args.rideContract,
      "Ride 1 should be the nearest"
    );
    assert.equal(
      availableRides[1],
      ride2.logs[0].args.rideContract,
      "Ride 2 should be the second nearest"
    );
    assert.equal(
      availableRides[2],
      ride3.logs[0].args.rideContract,
      "Ride 3 should be the third nearest"
    );
    assert.equal(
      availableRides[3],
      ride4.logs[0].args.rideContract,
      "Ride 4 should be the fourth nearest"
    );
    assert.equal(
      availableRides[4],
      ride5.logs[0].args.rideContract,
      "Ride 5 should be the fifth nearest"
    );
  });
});
