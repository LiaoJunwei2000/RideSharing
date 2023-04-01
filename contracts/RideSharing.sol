// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StructDeclaration.sol";
import "./User.sol";
import "./Ride.sol";

contract RideSharing {
    User private userContract;
    address public rideContractAddress;
    mapping(address => bool) public riderHasActiveRide;
    mapping(address => bool) public driverHasActiveRide;

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

    /**
     * @dev function to calculate the distance between two sets of coordinates
     */
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

    /**
     * @dev creates a ride request with a given fare and coordinates
     */
    function createRide(
        uint256 fare,
        int256 startLat,
        int256 startLong,
        int256 endLat,
        int256 endLong
    ) public {
        (, , bool isDriver, , ) = userContract.getUserInfo(msg.sender);
        require(!isDriver, "Only riders can create rides.");
        require(
            !riderHasActiveRide[msg.sender],
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

        riderHasActiveRide[msg.sender] = true;
        ridesList.push(rideContractAddress);
        emit RideCreated(rideContractAddress, rideIndex, msg.sender);
    }

    /**
     * @dev Allows a driver to accept a ride with a given ride index
     */
    function acceptRide(uint rideIndex) public {
        (, , bool isDriver, , ) = userContract.getUserInfo(msg.sender);
        require(isDriver, "Only drivers can accept rides.");
        require(
            !driverHasActiveRide[msg.sender],
            "Driver already has an active ride."
        );

        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(rideInfo.driver == address(0), "Ride already has a driver.");

        rideContract.setDriver(rideIndex, msg.sender);
        driverHasActiveRide[msg.sender] = true;
        emit RideAccepted(rideIndex, msg.sender);
    }

    /**
     * @dev Allows the driver and drive to mark a ride as completed
     */
    function completeRide(uint rideIndex, uint8 rating) public {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);

        require(
            (msg.sender == rideInfo.rider) || (msg.sender == rideInfo.driver),
            "Only rider or driver can complete the ride."
        );

        require(!rideInfo.isCompleted, "Ride has already been completed");

        bool isRider = rideInfo.rider == msg.sender;

        userContract.rateUser(
            isRider ? rideInfo.driver : rideInfo.rider,
            rating,
            isRider
        );

        rideContract.completeRide(rideIndex);

        if (isRider) {
            riderHasActiveRide[msg.sender] = false;
        } else {
            driverHasActiveRide[msg.sender] = false;
        }
    }

    /**
     * @dev Allows the rider to cancel a ride
     */
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

    /**
     * @dev returns the ride index for a given index if it exists otherwise  0
     */
    function getRideIndex(uint index) public view returns (uint) {
        return index < ridesList.length ? index : 0;
    }

    /**
     * @dev returns the total number of rides created
     */
    function getRideCount() public view returns (uint) {
        return ridesList.length;
    }

    /**
     * @dev Returns a list of the 5 nearest available rides for a driver based on their location
     *
     */
    function getAvailableRides(
        int256 driverLat,
        int256 driverLong
    ) public view returns (address[] memory) {
        (, , bool isDriver, , ) = userContract.getUserInfo(msg.sender);
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
