// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPriceOracle is Ownable {
    uint256 private price;

    constructor(uint256 initialPrice) Ownable(msg.sender) {
        price = initialPrice;
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }
}