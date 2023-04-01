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
            isCompleted: false,
            isCancelled: false
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
        rideInfo.isCompleted =
            rideInfo.riderCompleted &&
            rideInfo.driverCompleted;
    }

    function cancelRide(uint rideIndex) public {
        RideInfo storage rideInfo = rides[rideIndex];

        require(!rideInfo.isCancelled, "Ride is already cancelled.");
        rideInfo.isCancelled = true;
    }

    function getRideDetails(
        uint rideIndex
    ) public view returns (RideInfo memory) {
        return rides[rideIndex];
    }
}
