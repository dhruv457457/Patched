// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PatchedMarket} from "../src/PatchedMarket.sol";
import {IPatchReceipt} from "../src/interfaces/IPatchReceipt.sol";

/// @notice Deploys PatchedMarket behind an ERC-1967 proxy and initializes it in the same transaction.
/// Used by the deploy scripts and the tests, so both exercise the real setup.
library MarketFactory {
    function deploy(IERC20 usdc, IPatchReceipt receipt, address admin, address treasury)
        internal
        returns (PatchedMarket market, address implementation)
    {
        implementation = address(new PatchedMarket());
        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation, abi.encodeCall(PatchedMarket.initialize, (usdc, receipt, admin, treasury))
        );
        market = PatchedMarket(address(proxy));
    }
}
