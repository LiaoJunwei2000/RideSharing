// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./User.sol";
import "./StructDeclaration.sol";
import "./Ride.sol";

contract RideSharing {
    User private userContract;
    address public rideContractAddress;
    mapping(address => uint) public riderRideIndex;
    mapping(address => uint) public driverRideIndex;
    address[] public ridesList;

    event RideCreated(
        address indexed rideContract,
        uint indexed rideIndex,
        address indexed rider
    );
    event RideAccepted(uint indexed rideIndex, address indexed driver);

    event RideCancelled(uint indexed rideIndex, address indexed rider);

    constructor(address _userContract, address _rideContractAddress) {
        userContract = User(_userContract);
        rideContractAddress = _rideContractAddress;
    }

    function sqrt(uint x) private pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function getDistance(
        int256 lat1,
        int256 long1,
        int256 lat2,
        int256 long2
    ) private pure returns (uint) {
        int256 dLat = lat2 - lat1;
        int256 dLong = long2 - long1;
        return uint(1000 * sqrt((uint((dLat * dLat) + (dLong * dLong)))));
    }

    function createRide(
        uint256 fare,
        int256 startLat,
        int256 startLong,
        int256 endLat,
        int256 endLong
    ) public {
        (, , bool isDriver, ) = userContract.getUserInfo(msg.sender);
        require(!isDriver, "Only riders can create rides.");
        require(
            riderRideIndex[msg.sender] == 0,
            "Rider already has an active ride."
        );

        Ride rideContract = Ride(rideContractAddress);
        uint rideIndex = rideContract.createRide(
            msg.sender,
            fare,
            startLat,
            startLong,
            endLat,
            endLong
        );

        riderRideIndex[msg.sender] = rideIndex;
        ridesList.push(rideContractAddress);
        emit RideCreated(rideContractAddress, rideIndex, msg.sender);
    }

    function acceptRide(uint rideIndex) public {
        (, , bool isDriver, ) = userContract.getUserInfo(msg.sender);
        require(isDriver, "Only drivers can accept rides.");
        require(
            driverRideIndex[msg.sender] == 0,
            "Driver already has an active ride."
        );

        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(rideInfo.driver == address(0), "Ride already has a driver.");

        rideContract.setDriver(rideIndex, msg.sender);
        driverRideIndex[msg.sender] = rideIndex;
        emit RideAccepted(rideIndex, msg.sender);
    }

    function completeRide(uint rideIndex) public {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(
            msg.sender == rideInfo.rider || msg.sender == rideInfo.driver,
            "Only rider or driver can complete the ride."
        );

        rideContract.completeRide(rideIndex);
        riderRideIndex[rideInfo.rider] = 0;
        driverRideIndex[rideInfo.driver] = 0;
    }

    function cancelRide(uint rideIndex) public {
        Ride rideContract = Ride(rideContractAddress);

        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);

        require(
            rideInfo.rider == msg.sender,
            "Only the rider can cancel the ride."
        );
        require(
            rideInfo.driver == address(0),
            "Ride can only be cancelled with no driver."
        );

        rideContract.cancelRide(rideIndex);
        emit RideCancelled(rideIndex, msg.sender);
    }

    function getRideIndex(uint index) public view returns (uint) {
        return index < ridesList.length ? index : 0;
    }

    function getRideCount() public view returns (uint) {
        return ridesList.length;
    }

    function getAvailableRides(
        int256 driverLat,
        int256 driverLong
    ) public view returns (address[] memory) {
        (, , bool isDriver, ) = userContract.getUserInfo(msg.sender);
        require(isDriver, "Only drivers can get available rides.");

        uint[] memory distances = new uint[](ridesList.length);
        address[] memory sortedRides = new address[](ridesList.length);

        for (uint i = 0; i < ridesList.length; i++) {
            Ride rideContract = Ride(ridesList[i]);
            RideInfo memory rideInfo = rideContract.getRideDetails(i);

            if (
                rideInfo.driver == address(0) &&
                !rideInfo.isCompleted &&
                !rideInfo.isCancelled
            ) {
                uint distance = getDistance(
                    driverLat,
                    driverLong,
                    rideInfo.startLat,
                    rideInfo.startLong
                );
                distances[i] = distance;
                sortedRides[i] = ridesList[i];
            }
        }

        for (uint i = 0; i < ridesList.length; i++) {
            for (uint j = i + 1; j < ridesList.length; j++) {
                if (distances[i] > distances[j]) {
                    uint tempDistance = distances[i];
                    distances[i] = distances[j];
                    distances[j] = tempDistance;

                    address tempRide = sortedRides[i];
                    sortedRides[i] = sortedRides[j];
                    sortedRides[j] = tempRide;
                }
            }
        }

        uint count = 0;
        for (uint i = 0; i < sortedRides.length; i++) {
            if (sortedRides[i] != address(0)) {
                count++;
            }
        }
        uint resultLength = count > 5 ? 5 : count;
        address[] memory nearestRides = new address[](resultLength);
        uint index = 0;
        for (uint i = 0; i < sortedRides.length && index < resultLength; i++) {
            if (sortedRides[i] != address(0)) {
                nearestRides[index] = sortedRides[i];
                index++;
            }
        }

        return nearestRides;
    }
}
