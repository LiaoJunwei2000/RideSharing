// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct RideInfo {
    address rider;
    address driver;
    uint256 fare;
    int256 startLat;
    int256 startLong;
    int256 endLat;
    int256 endLong;
    bool atLeastOneCompleted;
    bool isCompleted;
    bool isCancelled;
}
