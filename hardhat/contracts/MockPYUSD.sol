// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @dev Mock PYUSD token for testing purposes
 * In production, this would be replaced with the actual PYUSD contract
 */
contract MockPYUSD is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("PayPal USD (Mock)", "PYUSD") {
        _decimals = 6; // PYUSD uses 6 decimals like USDC
        
        // Mint initial supply for testing (1 million PYUSD)
        _mint(msg.sender, 1000000 * 10**_decimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens for testing purposes
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function for testing - gives 1000 PYUSD to any address
     */
    function faucet(address to) external {
        require(to != address(0), "Invalid address");
        _mint(to, 1000 * 10**_decimals); // 1000 PYUSD
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from account (with allowance)
     */
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}
