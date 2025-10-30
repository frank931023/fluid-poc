// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RwaNft is ERC721, Ownable {
    constructor(address initialOwner) ERC721("RWA NFT", "RWA") Ownable(initialOwner) {}

    function min(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }
}


