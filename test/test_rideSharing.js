const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions"); // npm truffle-assertions
const BigNumber = require("bignumber.js"); // npm install bignumber.js
const assert = require("assert");

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
  const fare = 5;
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

    await userContract.registerUser(
      "Driver Name",
      "driver@example.com",
      true,
      "Tesla Model S",
      "AB123CD",
      { from: driver }
    );

    await rideSharingContract.getRT({ from: rider, value: oneEth / 10 });
  });

  it("should be able to buy Ride Tokens", async () => {
    const tx = await rideSharingContract.getRT({
      from: rider,
      value: oneEth / 1000,
    });
    truffleAssert.eventEmitted(tx, "BuyCredit", (ev) => {
      return ev.rideTokenAmt == 1;
    });
  });

  it("should allow users to withdraw RideToken to ETH", async () => {
    const rtAmt = 10;
    await rideSharingContract.getRT({
      from: accounts[6],
      value: (rtAmt * oneEth) / 1000,
    });

    const initialBalance = await web3.eth.getBalance(accounts[6]);

    const tx = await rideSharingContract.returnRT({
      from: accounts[6],
    });

    const finalBalance = await web3.eth.getBalance(accounts[6]);

    const difference = (finalBalance - initialBalance) / (oneEth / 1000);

    truffleAssert.eventEmitted(
      tx,
      "ReturnCredits",
      (ev) => ev.rideTokenAmt == rtAmt
    );

    assert.equal(difference < rtAmt * 0.95, true);
    assert.equal(difference > 0, true);
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

  it("should not allow a user withdraw money if they have haven't complete the ride", async () => {
    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );

    truffleAssert.reverts(
      rideSharingContract.returnRT({
        from: rider,
      }),
      "User cannot withdraw money if they have haven't complete the ride."
    );

    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.acceptRide(rideIndex, {
      from: driver,
    });

    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(rideDetails.driver, driver, "Driver address should match.");
  });

  it("should allow a rider to accept a driver", async () => {
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

    const riderAccept = await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
    });

    truffleAssert.eventEmitted(
      riderAccept,
      "RideReadyToStart",
      (ev) => ev.rideIndex == 0
    );
  });

  it("should allow a rider to reject a driver", async () => {
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

    const riderReject = await rideSharingContract.rejectDriver(rideIndex, {
      from: rider,
    });

    truffleAssert.eventEmitted(
      riderReject,
      "RideRejected",
      (ev) => ev.rideIndex == 0
    );
    const rideDetails = await rideContract.getRideDetails(rideIndex);
    assert.equal(
      rideDetails.driver,
      "0x0000000000000000000000000000000000000000",
      "Ride should have no driver after being driver is rejected"
    );
  });

  it("should not allow ride to be started if rider has not accepted the driver", async () => {
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

    truffleAssert.reverts(
      rideSharingContract.startRide(rideIndex, {
        from: driver,
      }),
      "Rider must accept the Driver to start the ride."
    );
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

    await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
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
      "Only rider or driver can call this function."
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

    await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: driver,
    });

    const result = await rideSharingContract.completeRide(rideIndex, 5, {
      from: rider,
    });

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

    await rideSharingContract.getRT({
      from: accounts[1],
      value: oneEth / 10,
    });
    await rideSharingContract.getRT({
      from: accounts[3],
      value: oneEth / 10,
    });
    await rideSharingContract.getRT({
      from: accounts[4],
      value: oneEth / 10,
    });
    await rideSharingContract.getRT({
      from: accounts[5],
      value: oneEth / 10,
    });
    await rideSharingContract.getRT({
      from: accounts[6],
      value: oneEth / 10,
    });
    await rideSharingContract.getRT({
      from: accounts[7],
      value: oneEth / 10,
    });
    // Create rides
    let ride1 = await rideSharingContract.createRide(5, 10, 10, 20, 20, {
      from: accounts[1],
    });
    let ride2 = await rideSharingContract.createRide(6, 15, 15, 25, 25, {
      from: accounts[3],
    });
    let ride3 = await rideSharingContract.createRide(7, 20, 20, 30, 30, {
      from: accounts[4],
    });
    let ride4 = await rideSharingContract.createRide(8, 30, 30, 40, 40, {
      from: accounts[5],
    });
    let ride5 = await rideSharingContract.createRide(9, 40, 40, 50, 50, {
      from: accounts[6],
    });
    let ride6 = await rideSharingContract.createRide(10, 50, 50, 60, 60, {
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

    // Cancel the ride

    const riderCancel = await rideSharingContract.cancelRide(rideIndex, {
      from: rider,
    });

    truffleAssert.eventEmitted(
      riderCancel,
      "RideCancelled",
      (ev) => ev.rideIndex == 0
    );
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
    await rideSharingContract.getRT({
      from: accounts[3],
      value: oneEth.multipliedBy(2),
    });

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

    await rideSharingContract.acceptDriver(0, { from: rider });

    await rideSharingContract.startRide(0, {
      from: driver,
    });

    await rideSharingContract.startRide(0, {
      from: rider,
    });

    const rideTx1 = await rideSharingContract.completeRide(0, 5, {
      from: driver,
    });

    truffleAssert.eventNotEmitted(rideTx1, "RideCompleted");

    const rideTx2 = await rideSharingContract.completeRide(0, 5, {
      from: driver,
    });

    truffleAssert.eventNotEmitted(rideTx2, "RideCompleted");

    const rideTx3 = await rideSharingContract.completeRide(0, 5, {
      from: rider,
    });

    truffleAssert.eventEmitted(rideTx3, "RideCompleted", (ev) => {
      return ev.rideIndex == 0;
    });
  });

  it("should pay driver and reduce the rider's token balance after the ride is completed", async () => {
    await rideSharingContract.createRide(
      fare,
      startLat,
      startLong,
      endLat,
      endLong,
      { from: rider }
    );

    const initialDriverBalance = await rideTokenContract.checkCredit(driver);
    const initialRiderBalance = await rideTokenContract.checkCredit(rider);

    const rideIndex = await rideSharingContract.getRideIndex(0);

    await rideSharingContract.acceptRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: driver,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: rider,
    });

    const finalDriverBalance = await rideTokenContract.checkCredit(driver);
    const finalRiderBalance = await rideTokenContract.checkCredit(rider);

    // The driver should be paid the fare
    assert.equal(
      finalDriverBalance.words[0],
      initialDriverBalance.words[0] + fare,
      "The driver should have been paid the fare."
    );

    // The rider's token balance should be reduced by the fare
    assert.equal(
      finalRiderBalance.words[0],
      initialRiderBalance.words[0] - fare,
      "The rider's token balance should be reduced by the fare."
    );
  });

  it("users should have rated each other when ride is completed", async () => {
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

    await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 3, {
      from: driver,
    });

    await rideSharingContract.completeRide(rideIndex, 2, {
      from: rider,
    });

    const riderInfo = await userContract.getUserInfo(rider);
    const driverInfo = await userContract.getUserInfo(driver);

    assert.equal(riderInfo["3"].words[0], 3);

    assert.equal(driverInfo["4"].words[0], 2);
  });

  it("should allow contract owner to withdraw fees from the contract and should disallow non-owners from withdrawing", async () => {
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

    await rideSharingContract.acceptDriver(rideIndex, {
      from: rider,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: driver,
    });

    await rideSharingContract.startRide(rideIndex, {
      from: rider,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: driver,
    });

    await rideSharingContract.completeRide(rideIndex, 5, {
      from: rider,
    });

    await rideSharingContract.returnRT({
      from: driver,
    });

    truffleAssert.reverts(
      rideSharingContract.withdrawFees({ from: accounts[1] })
    );

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await rideSharingContract.withdrawFees({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const diff = (finalBalance - initialBalance) / (oneEth / 1000);
    assert.equal(diff > 0, true);
    assert.equal(diff <= fare * 0.05, true);
  });
});
