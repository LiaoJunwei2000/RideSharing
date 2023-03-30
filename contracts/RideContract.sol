pragma solidity ^0.5.0;

import "./User.sol";

contract RideContract {
    Rider public rider;
    Driver public driver;
    uint public fare;
    bool public completed;

    constructor(Rider _rider, Driver _driver, uint _fare) public {
        rider = _rider;
        driver = _driver;
        fare = _fare;
        completed = false;
    }

    function completeRide() public {
        completed = true;
    }
}
