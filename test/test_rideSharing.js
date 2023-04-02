const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions"); // npm truffle-assertions
const BigNumber = require("bignumber.js"); // npm install bignumber.js
var assert = require("assert");

const User = artifacts.require("User");
const RideSharing = artifacts.require("RideSharing");
const Ride = artifacts.require("Ride");
const RideToken = artifacts.require("RideToken");
const oneEth = new BigNumber(1000000000000000000);
contract("RideSharing", (accounts) => {
  let userContract;
  let rideSharingContract;
  let rideContract;
  let rideTokenContract;
  const rider = accounts[1];
  const driver = accounts[2];
  const fare = 10;
  const startLat = 12345678;
  const startLong = 23456789;
  const endLat = 34567890;
  const endLong = 45678901;

  beforeEach(async () => {
    userContract = await User.new();
    rideContract = await Ride.new();
    rideTokenContract = await RideToken.new();
    rideSharingContract = await RideSharing.new(
      rideTokenContract.address,
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
    await rideSharingContract.getRT(
      { from: rider,
      value:oneEth, }
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

  it("should allow both rider and driver to start the ride independently", async () => {
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

    const riderStart = await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    truffleAssert.eventNotEmitted(riderStart, "RideStarted");

    const riderAndDriverStart = await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    truffleAssert.eventEmitted(
      riderAndDriverStart,
      "RideStarted",
      (ev) => ev.rideIndex == 0
    );
  });

  it("should not allow a third party to start the ride", async () => {
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

    await truffleAssert.reverts(
      rideSharingContract.startRide(rideIndex, { from: accounts[3] }),
      "Only the rider or driver can start the ride."
    );
  });

  it("should complete a ride", async () => {
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

    await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: rider,
    });

    const result = await rideSharingContract.completeRide(rideIndex, 5, {
      from: driver,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.rideStatus, 2, "Ride should be completed.");
    truffleAssert.eventEmitted(result, "RideCompleted", (ev) => {
      return ev.rideIndex == 0;
    });
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
    
    await rideSharingContract.getRT(
      { from: accounts[1],
      value:oneEth.multipliedBy(2), }
    );
    await rideSharingContract.getRT(
      { from: accounts[3],
      value:oneEth.multipliedBy(2), }
    );
    await rideSharingContract.getRT(
      { from: accounts[4],
      value:oneEth.multipliedBy(2), }
    );
    await rideSharingContract.getRT(
      { from: accounts[5],
      value:oneEth.multipliedBy(2), }
    );
    await rideSharingContract.getRT(
      { from: accounts[6],
      value:oneEth.multipliedBy(2), }
    );
    await rideSharingContract.getRT(
      { from: accounts[7],
      value:oneEth.multipliedBy(2), }
    );
    // Create rides
    let ride1 = await rideSharingContract.createRide(50, 10, 10, 20, 20, {
      from: accounts[1],
    });
    let ride2 = await rideSharingContract.createRide(60, 15, 15, 25, 25, {
      from: accounts[3],
    });
    let ride3 = await rideSharingContract.createRide(70, 20, 20, 30, 30, {
      from: accounts[4],
    });
    let ride4 = await rideSharingContract.createRide(80, 30, 30, 40, 40, {
      from: accounts[5],
    });
    let ride5 = await rideSharingContract.createRide(90, 40, 40, 50, 50, {
      from: accounts[6],
    });
    let ride6 = await rideSharingContract.createRide(100, 50, 50, 60, 60, {
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

    assert.equal(rideDetails.rideStatus, 3, "Ride should be cancelled");
  });

  it("should not allow rider to create multiple rides at the same time", async () => {
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
    await rideSharingContract.getRT(
      { from: accounts[3],
      value:oneEth.multipliedBy(2), }
    );

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

  it("ride should only be completed if both driver and rider completes the trip", async () => {
    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );
    await rideSharingContract.acceptRide(0, { from: driver });

    await rideSharingContract.startRide(0, {
      from: driver,
    });

    await rideSharingContract.startRide(0, {
      from: rider,
    });

    const rideTx1 = await rideSharingContract.completeRide(0, 5, {
      from: rider,
    });

    truffleAssert.eventNotEmitted(rideTx1, "RideCompleted");

    const rideTx2 = await rideSharingContract.completeRide(0, 5, {
      from: rider,
    });

    truffleAssert.eventNotEmitted(rideTx2, "RideCompleted");

    const driverTx1 = await rideSharingContract.completeRide(0, 5, {
      from: driver,
    });

    truffleAssert.eventEmitted(driverTx1, "RideCompleted", (ev) => {
      return ev.rideIndex == 0;
    });
  });
});
