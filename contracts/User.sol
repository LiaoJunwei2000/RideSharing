pragma solidity ^0.5.0;

contract User {
    struct user {
        address walletAddress;
        string name;
        uint256 userID;
    }

    uint256 rating;
    uint256 numUsers = 0;

    mapping(uint256 => user) private users;
    mapping(address => user) private userInfo;

    //event AccountCreated()

    function createAccount(string memory name) public {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(
            userInfo[msg.sender].walletAddress == address(0),
            "User already exists"
        );

        user memory newUser = user(msg.sender, name, numUsers + 1);
        // Add new user to mapping users
        users[numUsers] = newUser;

        // Add new user to mapping userInfo

        userInfo[msg.sender] = newUser;

        numUsers++;
    }
}

contract Rider is User {
    //import "./User.sol";
    struct rider {
        uint256 passengerRating;
        uint256 numRides;
        uint256 numPassengers;
    }

    function bookRide() private {}

    function cancelRide() private {}

    function completeRide() private {}
}

contract Driver is User {
    //import "./User.sol";

    struct driver {
        uint256 driverRating;
        uint256 numRides;
        string carPlate;
        string carModel;
        uint256 passengerCapacity;
    }

    function acceptRide() private {}

    function cancelRide() private {}

    function completeRide() private {}
}
