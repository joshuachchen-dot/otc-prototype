// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/OTCTrade.sol";
import "../src/FundToken.sol";
import "../src/NAVRegistry.sol";

contract OTCTradeTest is Test {
    FundToken   token;
    NAVRegistry nav;
    OTCTrade    otc;

    address admin  = address(this);
    address seller = address(0x1);
    address buyer  = address(0x2);

    uint256 constant AMOUNT    = 500e18;
    uint256 constant NAV_FLOOR = 2_000_000_000; // $2,000 scaled ×1e6
    uint256 constant NAV_GOOD  = 3_000_000_000; // $3,000

    function setUp() public {
        token = new FundToken(admin, "OTC Fund", "OTCF");
        nav   = new NAVRegistry(admin);
        otc   = new OTCTrade(address(token), address(nav));

        // Grant test contract the roles needed to mint/burn in setUp
        token.grantRole(token.SUBSCRIPTION_ROLE(), admin);
        token.grantRole(token.REDEMPTION_ROLE(),   admin);

        // Grant OTCTrade the roles it needs to burn/mint during settlement
        token.grantRole(token.REDEMPTION_ROLE(),   address(otc));
        token.grantRole(token.SUBSCRIPTION_ROLE(), address(otc));

        // Whitelist counterparties for p2p transfers
        token.setWhitelisted(seller, true);
        token.setWhitelisted(buyer,  true);

        // Fund seller
        token.mint(seller, AMOUNT);

        // Post a fresh NAV
        nav.postNAV(NAV_GOOD, block.timestamp);
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    function testSettle_SuccessfulSettlement() public {
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);
        otc.settle(id);

        OTCTrade.Trade memory t = otc.getTrade(id);
        assertEq(uint8(t.status), uint8(OTCTrade.Status.Settled));
        assertEq(token.balanceOf(seller), 0);
        assertEq(token.balanceOf(buyer),  AMOUNT);
    }

    // ── Staleness guard ──────────────────────────────────────────────────────

    function testSettle_RevertsOnStaleNAV() public {
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);

        // Warp past MAX_NAV_AGE without posting a new NAV
        vm.warp(block.timestamp + otc.MAX_NAV_AGE() + 1);

        vm.expectRevert("STALE_NAV");
        otc.settle(id);
    }

    function testSettle_SucceedsWithFreshNAVAfterWarp() public {
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);

        vm.warp(block.timestamp + otc.MAX_NAV_AGE() + 1);
        // Post a new NAV to refresh
        nav.postNAV(NAV_GOOD, block.timestamp);

        otc.settle(id);
        assertEq(uint8(otc.getTrade(id).status), uint8(OTCTrade.Status.Settled));
    }

    // ── NAV floor guard ──────────────────────────────────────────────────────

    function testSettle_RevertsWhenNAVBelowFloor() public {
        nav.postNAV(1_500_000_000, block.timestamp); // $1,500 < $2,000 floor
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);

        vm.expectRevert("NAV_BELOW_FLOOR");
        otc.settle(id);
    }

    // ── Seller balance guard ─────────────────────────────────────────────────

    function testSettle_RevertsOnInsufficientSellerBalance() public {
        // Only 100 tokens, trade requires 500
        token.burnFrom(seller, AMOUNT - 100e18);

        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);

        vm.expectRevert("SELLER_INSUFFICIENT_BALANCE");
        otc.settle(id);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    function testCancel_ByAgent() public {
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);
        otc.cancel(id, "test cancel");

        assertEq(uint8(otc.getTrade(id).status), uint8(OTCTrade.Status.Cancelled));
    }

    function testSettle_RevertsOnCancelledTrade() public {
        uint256 id = otc.propose(seller, buyer, AMOUNT, NAV_FLOOR);
        otc.cancel(id, "cancelled");

        vm.expectRevert("NOT_PENDING");
        otc.settle(id);
    }
}
