// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract User {
    struct UserInfo {
        string name;
        string email;
        uint256 riderTotalRating;
        uint256 riderRatingCount;
        uint256 driverTotalRating;
        uint256 driverRatingCount;
        bool isDriver;
        string carModel;
        string carPlate;
    }

    mapping(address => UserInfo) private users;
    mapping(address => bool) private registered;

    event UserRegistered(
        address indexed user,
        string name,
        string email,
        bool isDriver,
        string carModel,
        string carPlate
    );

    function registerUser(
        string memory name,
        string memory email,
        bool isDriver,
        string memory carModel,
        string memory carPlate
    ) public {
        require(!registered[msg.sender], "Account is already registered.");
        users[msg.sender] = UserInfo(
            name,
            email,
            0,
            0,
            0,
            0,
            isDriver,
            carModel,
            carPlate
        );
        registered[msg.sender] = true;
        emit UserRegistered(
            msg.sender,
            name,
            email,
            isDriver,
            carModel,
            carPlate
        );
    }

    function rateUser(address user, uint256 rating, bool isRider) public {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5.");
        require(user != msg.sender, "Cannot rate yourself.");
        UserInfo storage userInfo = users[user];
        if (isRider) {
            userInfo.riderTotalRating += rating;
            userInfo.riderRatingCount += 1;
        } else {
            userInfo.driverTotalRating += rating;
            userInfo.driverRatingCount += 1;
        }
    }

    function getUserInfo(
        address user
    )
        public
        view
        returns (string memory, string memory, bool, uint256, uint256)
    {
        UserInfo memory userInfo = users[user];
        return (
            userInfo.name,
            userInfo.email,
            userInfo.isDriver,
            getUserRating(user, true),
            getUserRating(user, false)
        );
    }

    function getUserRating(
        address user,
        bool isRider
    ) public view returns (uint256) {
        UserInfo storage userInfo = users[user];
        uint256 ratingCount = isRider
            ? userInfo.riderRatingCount
            : userInfo.driverRatingCount;
        uint256 totalRating = isRider
            ? userInfo.riderTotalRating
            : userInfo.driverTotalRating;

        if (ratingCount == 0) {
            return 0;
        } else {
            return totalRating / ratingCount;
        }
    }
}
