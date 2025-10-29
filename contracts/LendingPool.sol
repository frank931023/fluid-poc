// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FakeUSDC.sol";
import "./RwaNft.sol";
import "./MockPriceOracle.sol";

contract LendingPool is Ownable(msg.sender) {
    FakeUSDC public fakeUSDC;
    RwaNft public rwaNft;
    MockPriceOracle public oracle;

    event LoanCreated(address indexed user, uint256 loanAmount, uint256 collateralTokenId);

    constructor(address _fakeUSDC, address _rwaNft, address _oracle) {
        fakeUSDC = FakeUSDC(_fakeUSDC);
        rwaNft = RwaNft(_rwaNft);
        oracle = MockPriceOracle(_oracle);
    }

    function fundPool(uint256 amount) external onlyOwner {
        bool ok = fakeUSDC.transferFrom(msg.sender, address(this), amount);
        require(ok, "FakeUSDC transferFrom failed");
    }

    function borrowAndPay(address merchant, uint256 totalAmountToPay, uint256 rwaTokenId) external {
        uint256 userBalance = fakeUSDC.balanceOf(msg.sender);

        uint256 amountToBorrow;
        uint256 amountToPayFromUser;

        // 计算用户自付与需借款金额，防止 underflow
        if (userBalance >= totalAmountToPay) {
            amountToBorrow = 0;
            amountToPayFromUser = totalAmountToPay;
        } else {
            amountToBorrow = totalAmountToPay - userBalance;
            amountToPayFromUser = userBalance;
        }

        if (amountToBorrow > 0) {
            // a) 获取 RWA 价格
            uint256 rwaPrice = oracle.getPrice();

            // b) 固定 LTV 为 50%，因此要求：amountToBorrow <= rwaPrice * 50%
            // 等价写法为：amountToBorrow * 2 <= rwaPrice
            require(amountToBorrow * 2 <= rwaPrice, "Insufficient collateral value");

            // c) 将用户的 RWA NFT 拉到本合约作为抵押（用户需先对 NFT approve 或 setApprovalForAll）
            rwaNft.transferFrom(msg.sender, address(this), rwaTokenId);

            // d) 确保池子里有足够资金放贷
            require(fakeUSDC.balanceOf(address(this)) >= amountToBorrow, "Pool has insufficient funds");
        }

        // 原子支付：先处理用户自有部分
        if (amountToPayFromUser > 0) {
            bool userPaid = fakeUSDC.transferFrom(msg.sender, merchant, amountToPayFromUser);
            require(userPaid, "User payment transferFrom failed");
        }

        // 再处理放贷部分（若有）
        if (amountToBorrow > 0) {
            bool loanPaid = fakeUSDC.transfer(merchant, amountToBorrow);
            require(loanPaid, "Pool loan transfer failed");
        }

        emit LoanCreated(msg.sender, amountToBorrow, rwaTokenId);
    }
}

