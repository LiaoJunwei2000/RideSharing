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

  beforeEach(async () => {
    userContract = await User.new();
    rideContract = await Ride.new();
    rideSharingContract = await RideSharing.new(
      userContract.address,
      rideContract.address
    );

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
    const fare = 100;
    const startLat = 12345678;
    const startLong = 23456789;
    const endLat = 34567890;
    const endLong = 45678901;

    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );
    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.acceptRide(rideIndex, {
      from: driver,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.driver, driver, "Driver address should match.");
  });

  it("should complete a ride", async () => {
    const fare = 100;
    const startLat = 12345678;
    const startLong = 23456789;
    const endLat = 34567890;
    const endLong = 45678901;

    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );

    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.acceptRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: driver,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.isCompleted, true, "Ride should be completed.");
  });

  it("should return the 5 nearest available rides", async () => {
    // Register users

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
    await userContract.registerUser(
      "Harry",
      "harry@example.com",
      false,
      "",
      "",
      {
        from: accounts[7],
      }
    );

    // Create rides
    let ride1 = await rideSharingContract.createRide(500, 10, 10, 20, 20, {
      from: accounts[1],
    });
    let ride2 = await rideSharingContract.createRide(600, 15, 15, 25, 25, {
      from: accounts[3],
    });
    let ride3 = await rideSharingContract.createRide(700, 20, 20, 30, 30, {
      from: accounts[4],
    });
    let ride4 = await rideSharingContract.createRide(800, 30, 30, 40, 40, {
      from: accounts[5],
    });
    let ride5 = await rideSharingContract.createRide(900, 40, 40, 50, 50, {
      from: accounts[6],
    });
    let ride6 = await rideSharingContract.createRide(1000, 50, 50, 60, 60, {
      from: accounts[7],
    });

    // Get available rides for driver
    let availableRides = await rideSharingContract.getAvailableRides(0, 0, {
      from: accounts[2],
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

  it("should allow rider to cancel a ride", async () => {
    // Create a ride
    const fare = 200;
    const startLat = 123456789;
    const startLong = 987654321;
    const endLat = 223456789;
    const endLong = 887654321;

    const rideCreationResult = await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );

    const rideIndex = rideCreationResult.logs[0].args.rideIndex.toNumber();
    const rideContractAddress = rideCreationResult.logs[0].args.rideContract;

    // Cancel the ride

    await rideSharingContract.cancelRide(rideIndex, {
      from: rider,
    });

    // Check if the ride is cancelled
    const ride = await Ride.at(rideContractAddress);
    const rideDetails = await ride.getRideDetails(rideIndex);

    assert.equal(rideDetails.isCancelled, true, "Ride should be cancelled");
  });

  it("should not allow rider to create multiple rides at the same time", async () => {
    const fare = 100;
    const startLat = 12345678;
    const startLong = 23456789;
    const endLat = 34567890;
    const endLong = 45678901;

    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );
    await rideSharingContract.acceptRide(0, { from: driver });

    await truffleAssert.reverts(
      rideSharingContract.createRide(
        fare,
        startLat,
        startLong,
        endLat,
        endLong,
        { from: rider }
      ),
      "Rider already has an active ride."
    );
  });

  it("should not allow driver to accept multiple rides at the same time", async () => {
    const fare = 100;
    const startLat = 12345678;
    const startLong = 23456789;
    const endLat = 34567890;
    const endLong = 45678901;

    await userContract.registerUser(
      "David",
      "david@example.com",
      false,
      "",
      "",
      { from: accounts[3] }
    );

    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );
    await rideSharingContract.acceptRide(0, { from: driver });

    rideSharingContract.createRide(fare, startLat, startLong, endLat, endLong, {
      from: accounts[3],
    }),
      await truffleAssert.reverts(
        rideSharingContract.acceptRide(1, { from: driver }),
        "Driver already has an active ride."
      );
  });
});
