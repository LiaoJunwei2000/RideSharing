// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20.sol";

contract RideToken {
    ERC20 erc20Contract;
    address owner;

    constructor() {
        ERC20 e = new ERC20();
        erc20Contract = e;
        owner = msg.sender;
    }

    event RideTokenTransfer(
        address indexed sender,
        address indexed recipient,
        uint256 amt
    );

    /**
     * @dev Function to give RT to the recipient for a given wei amount
     * @param recipient address of the recipient that wants to buy the RT
     * @param weiAmt uint256 amount indicating the amount of wei that was passed
     * @return A uint256 representing the amount of RT bought by the msg.sender.
     */
    function getCredit(
        address recipient,
        uint256 weiAmt
    ) public returns (uint256) {
        uint256 amt = weiAmt / (1000000000000000000 / 1000); // Convert weiAmt to Ride Token
        erc20Contract.mint(recipient, amt);
        return amt;
    }

    /**
     * @dev Function to check the amount of RT the msg.sender has
     * @param ad address of the recipient that wants to check their RT
     * @return A uint256 representing the amount of RT owned by the msg.sender.
     */
    function checkCredit(address ad) public view returns (uint256) {
        uint256 credit = erc20Contract.balanceOf(ad);
        return credit;
    }

    /**
     * @dev Function to transfer the credit from the owner to the recipient
     * @param recipient address of the recipient that will gain in RT
     * @param amt uint256 aount of RT to transfer
     */
    function transferCredit(address recipient, uint256 amt) public {
        // Transfers from tx.origin to receipient
        erc20Contract.transfer(recipient, amt);
        emit RideTokenTransfer(tx.origin, recipient, amt);
    }

    function transferCreditFrom(
        address sender,
        address recipient,
        uint256 amt
    ) public {
        erc20Contract.transferFrom(sender, recipient, amt);
        emit RideTokenTransfer(sender, recipient, amt);
    }

    function approve(address _spender, uint256 _value) public {
        erc20Contract.approve(_spender, _value);
    }
}
