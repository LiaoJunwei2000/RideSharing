pragma solidity ^0.5.0;

contract User {
    struct UserInfo {
        string name;
        string email;
        uint256 totalRating;
        uint256 ratingCount;
        bool isDriver;
        string carModel;
        string carPlate;
    }

    mapping(address => UserInfo) private users;

    function registerUser(
        string memory name,
        string memory email,
        bool isDriver,
        string memory carModel,
        string memory carPlate
    ) public {
        users[msg.sender] = UserInfo(
            name,
            email,
            0,
            0,
            isDriver,
            carModel,
            carPlate
        );
    }

    function rateUser(address user, uint256 rating) public {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5.");
        require(user != msg.sender, "Cannot rate yourself.");
        UserInfo storage userInfo = users[user];
        userInfo.totalRating += rating;
        userInfo.ratingCount += 1;
    }

    function getUserInfo(
        address user
    ) public view returns (string memory, string memory, bool, uint256) {
        UserInfo memory userInfo = users[user];
        return (
            userInfo.name,
            userInfo.email,
            userInfo.isDriver,
            getUserRating(user)
        );
    }

    function getUserRating(address user) public view returns (uint256) {
        UserInfo storage userInfo = users[user];
        if (userInfo.ratingCount == 0) {
            return 0;
        } else {
            return userInfo.totalRating / userInfo.ratingCount;
        }
    }
}
