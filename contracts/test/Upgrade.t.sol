// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PatchedMarket} from "../src/PatchedMarket.sol";
import {IPatchReceipt} from "../src/interfaces/IPatchReceipt.sol";
import {BaseTest} from "./Base.t.sol";

/// A stand-in for a future version: same storage, one extra function.
contract PatchedMarketV2 is PatchedMarket {
    function version() external pure returns (uint256) {
        return 2;
    }
}

contract UpgradeTest is BaseTest {
    function test_initialize_setsDefaults() public view {
        assertEq(market.feeBps(), 500);
        assertEq(market.royaltyBps(), 500);
        assertEq(market.minBond(), 25e6);
        assertEq(market.disputeWindow(), 72 hours);
        assertEq(market.minDisputeWindow(), 1 hours);
        assertEq(market.snipeWindow(), 5 minutes);
        assertEq(market.nextListingId(), 1);
        assertEq(market.nextEventId(), 1);
        assertTrue(market.hasRole(market.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_cannotInitializeTwice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        market.initialize(IERC20(address(usdc)), IPatchReceipt(address(receipt)), alice, alice);
    }

    function test_implementationCannotBeInitialized() public {
        PatchedMarket impl = new PatchedMarket();
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        impl.initialize(IERC20(address(usdc)), IPatchReceipt(address(receipt)), alice, alice);
    }

    function test_upgrade_keepsListingsAndMoney() public {
        uint256 id = _delivering(); // alice 200 and bob 300 locked, listing in delivery
        uint256 escrowed = usdc.balanceOf(address(market));
        address marketAddress = address(market);

        PatchedMarketV2 v2 = new PatchedMarketV2();
        vm.prank(admin);
        market.upgradeToAndCall(address(v2), "");

        assertEq(address(market), marketAddress); // same address
        assertEq(PatchedMarketV2(marketAddress).version(), 2); // new logic
        assertEq(usdc.balanceOf(marketAddress), escrowed); // money untouched
        assertEq(market.getListing(id).creator, creator); // data untouched
        assertEq(uint8(market.getListing(id).status), uint8(PatchedMarket.Status.Delivering));
        assertEq(market.feeBps(), 500);
    }

    function test_upgrade_onlyAdmin() public {
        address v2 = address(new PatchedMarketV2());
        vm.prank(alice);
        vm.expectRevert();
        market.upgradeToAndCall(v2, "");
    }

    function test_freezeUpgrades_isPermanent() public {
        address v2 = address(new PatchedMarketV2());
        vm.prank(alice);
        vm.expectRevert();
        market.freezeUpgrades();

        vm.prank(admin);
        market.freezeUpgrades();
        assertTrue(market.upgradesFrozen());

        vm.prank(admin);
        vm.expectRevert(PatchedMarket.UpgradesAreFrozen.selector);
        market.upgradeToAndCall(v2, "");
    }
}
