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

    function setDriver(uint rideIndex, address driver) public {
        rides[rideIndex].driver = driver;
    }

    function completeRide(uint rideIndex, bool isRider) public {
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

    function startRide(uint rideIndex, address orignalCaller) public {
        RideInfo storage rideInfo = rides[rideIndex];

        require(
            rideInfo.rideStatus == RideStatus.Created,
            "Ride must be in the Created status to be started."
        );

        require(
            orignalCaller == rideInfo.rider || orignalCaller == rideInfo.driver,
            "Only Rider or driver can start the ride "
        );

        if (orignalCaller == rideInfo.rider) {
            rideInfo.riderStarted = true;
        } else {
            rideInfo.driverStarted = true;
        }

        if (rideInfo.riderStarted && rideInfo.driverStarted) {
            rideInfo.rideStatus = RideStatus.Started;
        }
    }

    function cancelRide(uint rideIndex) public {
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
