// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Team payees for a listing, split out of PatchedMarket to keep it under the 24 KB contract size limit.
///         Linked as an external library: it runs in the market's storage (delegatecall).
library PayeesLib {
    uint8 internal constant MAX_PAYEES = 8;
    uint16 internal constant BPS = 10_000;

    /// Same selector as PatchedMarket.InvalidParams.
    error InvalidParams();

    /// @notice Check and store a listing's payees: none (the creator is paid), or up to 8 with shares adding up to 100%.
    function set(
        mapping(uint256 => address[]) storage payeesOf,
        mapping(uint256 => uint16[]) storage sharesOf,
        uint256 id,
        address[] calldata payees,
        uint16[] calldata shares
    ) external {
        uint256 n = payees.length;
        if (n == 0) {
            if (shares.length != 0) revert InvalidParams();
            return;
        }
        if (n > MAX_PAYEES || shares.length != n) revert InvalidParams();
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (payees[i] == address(0) || shares[i] == 0) revert InvalidParams();
            sum += shares[i];
        }
        if (sum != BPS) revert InvalidParams();
        payeesOf[id] = payees;
        sharesOf[id] = shares;
    }
}
