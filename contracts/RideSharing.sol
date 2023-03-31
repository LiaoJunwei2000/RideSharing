pragma solidity ^0.5.0;

import "./User.sol";
import "./Ride.sol";

contract RideSharing {
    User private userContract;
    mapping(address => uint) public riderRideIndex;
    mapping(address => uint) public driverRideIndex;
    address[] public ridesList;

    event RideCreated(
        address indexed rideContract,
        uint indexed rideIndex,
        address indexed rider
    );
    event RideAccepted(uint indexed rideIndex, address indexed driver);

    constructor(address _userContract) public {
        userContract = User(_userContract);
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
        address rideContractAddress,
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

    function acceptRide(address rideContractAddress, uint rideIndex) public {
        (, , bool isDriver, ) = userContract.getUserInfo(msg.sender);
        require(isDriver, "Only drivers can accept rides.");
        require(
            driverRideIndex[msg.sender] == 0,
            "Driver already has an active ride."
        );

        Ride rideContract = Ride(rideContractAddress);
        (, address driver, , , , , , ) = rideContract.getRideDetails(rideIndex);
        require(driver == address(0), "Ride already has a driver.");

        rideContract.setDriver(rideIndex, msg.sender);
        driverRideIndex[msg.sender] = rideIndex;
        emit RideAccepted(rideIndex, msg.sender);
    }

    function completeRide(address rideContractAddress, uint rideIndex) public {
        Ride rideContract = Ride(rideContractAddress);
        (address rider, address driver, , , , , , ) = rideContract
            .getRideDetails(rideIndex);
        require(
            msg.sender == rider || msg.sender == driver,
            "Only rider or driver can complete the ride."
        );

        rideContract.completeRide(rideIndex);
        riderRideIndex[rider] = 0;
        driverRideIndex[driver] = 0;
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
            (
                ,
                address currentDriver,
                ,
                int256 startLat,
                int256 startLong,
                ,
                ,
                bool isCompleted
            ) = rideContract.getRideDetails(i);
            if (currentDriver == address(0) && !isCompleted) {
                uint distance = getDistance(
                    driverLat,
                    driverLong,
                    startLat,
                    startLong
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
