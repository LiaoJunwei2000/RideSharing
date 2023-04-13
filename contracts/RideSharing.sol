// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StructDeclaration.sol";
import "./User.sol";
import "./Ride.sol";
import "./RideToken.sol";

contract RideSharing {
    User private userContract;
    address public rideTokenContractAddress;
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

    event RideRejected(uint indexed rideIndex);

    event RideReadyToStart(uint indexed rideIndex);

    event RideStarted(uint indexed rideIndex);

    event RideCompleted(uint indexed rideIndex);

    event BuyCredit(uint256 rideTokenAmt); //event of minting of RT to the msg.sender

    event ReturnCredits(uint256 rideTokenAmt); //event of returning of RT of the msg.sender

    constructor(
        address _rideTokenContractAddress,
        address _userContract,
        address _rideContractAddress
    ) {
        rideTokenContractAddress = _rideTokenContractAddress;
        userContract = User(_userContract);
        rideContractAddress = _rideContractAddress;
    }

    modifier riderOnly(uint rideIndex) {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(
            rideInfo.rider == msg.sender,
            "Only rider can call this function."
        );
        _;
    }

    modifier riderOrDriverOnly(uint rideIndex) {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(
            rideInfo.driver == msg.sender || rideInfo.rider == msg.sender,
            "Only rider or driver can call this function."
        );
        _;
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
     * @dev Takes in Eth from the msg.sender and gives him DiceToken in return
     */
    function getRT() public payable {
        // Hint 1: default currency for msg.value is in wei
        require(msg.value >= 1E15, "At least 0.001ETH needed to get RT");
        uint256 amt = msg.value / (1000000000000000000 / 1000);
        RideToken rideTokenContract = RideToken(rideTokenContractAddress);
        rideTokenContract.getCredit(msg.sender, msg.value);
        emit BuyCredit(amt);
    }

    /**
     * @dev Function to check the amount of RT the msg.sender has
     * @return A uint256 representing the amount of RT owned by the msg.sender.
     */
    function checkRT() public view returns (uint256) {
        RideToken rideTokenContract = RideToken(rideTokenContractAddress);
        return rideTokenContract.checkCredit(msg.sender);
    }

    /**
     * @dev Function to return the RT to the casino and get ether back at the conversion rate of 0.009 Eth per RT
     */
    function returnRT() public {
        uint256 rtAmt = checkRT();
        require(
            !riderHasActiveRide[msg.sender] && !driverHasActiveRide[msg.sender],
            "User cannot withdraw money if they have haven't complete the ride."
        );
        RideToken rideTokenContract = RideToken(rideTokenContractAddress);
        // Transfer RT from reciepent to contract owner
        rideTokenContract.transferCredit(address(this), rtAmt);
        address payable recipient = payable(msg.sender);
        uint256 amountReturn = (rtAmt * (1000000000000000000 / 100) * 9) / 10;
        recipient.transfer(amountReturn);
        emit ReturnCredits(rtAmt);
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
        require(checkRT() >= fare, "Not enough RideToken in your account");
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

    function acceptDriver(uint rideIndex) public riderOnly(rideIndex) {
        (, , bool isDriver, , ) = userContract.getUserInfo(msg.sender);
        require(!isDriver, "Only riders can accept drivers.");
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(rideInfo.driver != address(0), "Must have a driver to accept");

        rideContract.acceptDriver(rideIndex);

        if (
            rideContract.getRideDetails(rideIndex).rideStatus ==
            RideStatus.ReadyToStart
        ) {
            emit RideReadyToStart(rideIndex);
        }
    }

    function rejectDriver(uint rideIndex) public riderOnly(rideIndex) {
        (, , bool isDriver, , ) = userContract.getUserInfo(msg.sender);
        require(!isDriver, "Only riders can reject drivers.");
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        require(rideInfo.driver != address(0), "Must have a driver to reject");

        rideContract.unsetDriver(rideIndex);
        driverHasActiveRide[rideInfo.driver] = false;

        emit RideRejected(rideIndex);
    }

    function startRide(uint rideIndex) public riderOrDriverOnly(rideIndex) {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);

        require(
            rideInfo.driver != address(0),
            "Must have a driver before being able to start a ride"
        );

        require(
            rideInfo.rideStatus == RideStatus.ReadyToStart,
            "Rider must accept the Driver to start the ride."
        );
        rideContract.startRide(rideIndex);

        if (
            rideContract.getRideDetails(rideIndex).rideStatus ==
            RideStatus.Started
        ) {
            emit RideStarted(rideIndex);
        }
    }

    /**
     * @dev Allows the driver and drive to mark a ride as completed
     */
    function completeRide(
        uint rideIndex,
        uint8 rating
    ) public riderOrDriverOnly(rideIndex) {
        Ride rideContract = Ride(rideContractAddress);
        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);
        RideToken rideTokenContract = RideToken(rideTokenContractAddress);

        require(
            rideInfo.rideStatus == RideStatus.Started,
            "Ride must be in the Started status to be completed."
        );

        require(
            rideInfo.rideStatus != RideStatus.Completed,
            "Ride has already been completed"
        );

        require(
            msg.sender == rideInfo.driver || rideInfo.driverCompleted,
            "driver must complete the ride before Rider completes"
        );

        bool isRider = rideInfo.rider == msg.sender;

        userContract.rateUser(
            isRider ? rideInfo.driver : rideInfo.rider,
            rating,
            !isRider
        );

        rideContract.completeRide(rideIndex, isRider);

        if (isRider) {
            riderHasActiveRide[msg.sender] = false;
        } else {
            driverHasActiveRide[msg.sender] = false;
        }

        if (
            rideContract.getRideDetails(rideIndex).rideStatus ==
            RideStatus.Completed
        ) {
            //transfer RT from RideSharing Contract to driver
            rideTokenContract.transferCredit(rideInfo.driver, rideInfo.fare);
            emit RideCompleted(rideIndex);
        }
    }

    /**
     * @dev Allows the rider to cancel a ride
     */
    function cancelRide(uint rideIndex) public riderOnly(rideIndex) {
        Ride rideContract = Ride(rideContractAddress);

        RideInfo memory rideInfo = rideContract.getRideDetails(rideIndex);

        require(
            rideInfo.driver == address(0),
            "Ride can only be cancelled with no driver."
        );
        require(
            rideInfo.rideStatus == RideStatus.Created,
            "Ride can only be cancelled in the Created State"
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
                rideInfo.rideStatus == RideStatus.Created
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
