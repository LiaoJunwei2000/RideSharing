// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StructDeclaration.sol";

contract Ride {
    RideInfo[] public rides;

    function createRide(
        address rider,
        uint256 fare,
        int256 startLat,
        int256 startLong,
        int256 endLat,
        int256 endLong
    ) public returns (uint) {
        RideInfo memory newRide = RideInfo({
            rider: rider,
            driver: address(0),
            fare: fare,
            startLat: startLat,
            startLong: startLong,
            endLat: endLat,
            endLong: endLong,
            riderCompleted: false,
            driverCompleted: false,
            rideStatus: RideStatus.Created,
            riderStarted: false,
            driverStarted: false
        });

        rides.push(newRide);
        return rides.length - 1;
    }

    modifier riderOnly(uint rideIndex) {
        require(rides[rideIndex].rider == tx.origin);
        _;
    }

    modifier driverOnly(uint rideIndex) {
        require(rides[rideIndex].driver == tx.origin);
        _;
    }

    modifier driverOrRiderOnly(uint rideIndex) {
        require(
            rides[rideIndex].driver == tx.origin ||
                rides[rideIndex].rider == tx.origin
        );
        _;
    }

    function setDriver(uint rideIndex, address driver) public {
        rides[rideIndex].driver = driver;
    }

    function unsetDriver(uint rideIndex) public riderOnly(rideIndex) {
        rides[rideIndex].driver = address(0);
    }

    function completeRide(
        uint rideIndex,
        bool isRider
    ) public driverOrRiderOnly(rideIndex) {
        RideInfo storage rideInfo = rides[rideIndex];
        if (isRider) {
            rideInfo.riderCompleted = true;
        } else {
            rideInfo.driverCompleted = true;
        }

        if (rideInfo.riderCompleted && rideInfo.driverCompleted) {
            rideInfo.rideStatus = RideStatus.Completed;
        }
    }

    function acceptDriver(uint rideIndex) public riderOnly(rideIndex) {
        RideInfo storage rideInfo = rides[rideIndex];
        rideInfo.rideStatus = RideStatus.ReadyToStart;
    }

    function startRide(uint rideIndex) public driverOrRiderOnly(rideIndex) {
        RideInfo storage rideInfo = rides[rideIndex];

        require(
            rideInfo.rideStatus == RideStatus.ReadyToStart,
            "Ride must be in the ReadyToStart status to be started."
        );

        if (tx.origin == rideInfo.rider) {
            rideInfo.riderStarted = true;
        } else {
            rideInfo.driverStarted = true;
        }

        if (rideInfo.riderStarted && rideInfo.driverStarted) {
            rideInfo.rideStatus = RideStatus.Started;
        }
    }

    function cancelRide(uint rideIndex) public riderOnly(rideIndex) {
        RideInfo storage rideInfo = rides[rideIndex];

        require(
            rideInfo.rideStatus != RideStatus.Cancelled,
            "Ride is already cancelled."
        );
        rideInfo.rideStatus = RideStatus.Cancelled;
    }

    function getRideDetails(
        uint rideIndex
    ) public view returns (RideInfo memory) {
        return rides[rideIndex];
    }
}
