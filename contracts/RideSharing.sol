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
}
