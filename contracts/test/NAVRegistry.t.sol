// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {NAVRegistry} from "src/NAVRegistry.sol";

/**
 * @title  NAVRegistry comprehensive test suite
 * @notice Covers posting NAV, reading history, access control,
 *         timestamp integrity, and gas benchmarks.
 */
contract NAVRegistryTest is Test {
    NAVRegistry nav;

    address admin   = address(0xA11CE);
    address manager = address(0xA4A1A);  // granted MANAGER_ROLE separately
    address hacker  = address(0xBAD);

    uint256 constant SAMPLE_NAV  = 123_456_789; // scaled NAV integer
    uint256 constant SAMPLE_ASOF = 1_710_000_000; // unix timestamp

    /* ─────────────────────────────── setup ─────────────────────────────── */

    function setUp() public {
        vm.prank(admin);
        nav = new NAVRegistry(admin);

        // Grant MANAGER_ROLE to a separate manager account
        vm.prank(admin);
        nav.grantRole(nav.MANAGER_ROLE(), manager);
    }

    /* ═══════════════════════ SINGLE POST + READ ════════════════════════ */

    /// postNAV stores nav, asOf, and sets storedAt to block.timestamp.
    function testPost_SingleAndReadBack() public {
        uint256 ts = block.timestamp;

        vm.prank(admin);
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);

        NAVRegistry.NavRecord memory rec = nav.latestNAV();
        assertEq(rec.nav,      SAMPLE_NAV,  "nav mismatch");
        assertEq(rec.asOf,     SAMPLE_ASOF, "asOf mismatch");
        assertEq(rec.storedAt, ts,          "storedAt should equal block.timestamp");
    }

    /// latestNAV reverts when no record has been posted.
    function testPost_LatestRevertsWhenEmpty() public {
        vm.expectRevert("NO_NAV");
        nav.latestNAV();
    }

    /* ═══════════════════════ MULTIPLE POSTS ════════════════════════════ */

    /// latestNAV always returns the most recent entry.
    function testPost_MultipleReturnsLatest() public {
        vm.startPrank(admin);
        nav.postNAV(100, 1_000);
        nav.postNAV(200, 2_000);
        nav.postNAV(300, 3_000);
        vm.stopPrank();

        NAVRegistry.NavRecord memory rec = nav.latestNAV();
        assertEq(rec.nav,  300);
        assertEq(rec.asOf, 3_000);
    }

    /// historyLength increments by one per postNAV call.
    function testPost_HistoryLength() public {
        assertEq(nav.historyLength(), 0);

        vm.startPrank(admin);
        nav.postNAV(1, 1);
        assertEq(nav.historyLength(), 1);
        nav.postNAV(2, 2);
        assertEq(nav.historyLength(), 2);
        vm.stopPrank();
    }

    /// history(i) returns the i-th record in insertion order.
    function testPost_HistoryIndexing() public {
        vm.startPrank(admin);
        nav.postNAV(111, 1_111);
        nav.postNAV(222, 2_222);
        vm.stopPrank();

        (uint256 n0, uint256 a0,) = nav.history(0);
        (uint256 n1, uint256 a1,) = nav.history(1);

        assertEq(n0, 111); assertEq(a0, 1_111);
        assertEq(n1, 222); assertEq(a1, 2_222);
    }

    /* ═══════════════════════ EMIT EVENTS ═══════════════════════════════ */

    /// postNAV emits NavPosted with correct arguments.
    function testPost_EmitsNavPostedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit NAVRegistry.NavPosted(SAMPLE_NAV, SAMPLE_ASOF, block.timestamp, admin);

        vm.prank(admin);
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);
    }

    /* ═══════════════════════ ACCESS CONTROL ════════════════════════════ */

    /// An address without MANAGER_ROLE cannot post NAV.
    function testAccess_HackerCannotPostNAV() public {
        vm.prank(hacker);
        vm.expectRevert();
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);
    }

    /// A separately granted manager can post NAV.
    function testAccess_GrantedManagerCanPost() public {
        vm.prank(manager);
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);

        assertEq(nav.latestNAV().nav, SAMPLE_NAV);
    }

    /// Admin can revoke MANAGER_ROLE; the ex-manager then cannot post.
    function testAccess_RevokedManagerCannotPost() public {
        vm.prank(admin);
        nav.revokeRole(nav.MANAGER_ROLE(), manager);

        vm.prank(manager);
        vm.expectRevert();
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);
    }

    /* ═══════════════════════ TIMESTAMP INTEGRITY ═══════════════════════ */

    /// storedAt reflects the actual block.timestamp at posting time.
    function testTimestamp_SetToBlockTime() public {
        uint256 warpTo = 1_800_000_000;
        vm.warp(warpTo);

        vm.prank(admin);
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);

        assertEq(nav.latestNAV().storedAt, warpTo);
    }

    /// Consecutive posts in different blocks get different storedAt values.
    function testTimestamp_DifferentBlocksDifferentStoredAt() public {
        vm.prank(admin);
        nav.postNAV(100, 1_000);
        uint256 first = nav.latestNAV().storedAt;

        vm.warp(block.timestamp + 60);
        vm.prank(admin);
        nav.postNAV(200, 2_000);
        uint256 second = nav.latestNAV().storedAt;

        assertGt(second, first, "second storedAt must be later than first");
    }

    /* ═════════════════════════ GAS BENCHMARKS ══════════════════════════ */

    /// Measure gas for a single postNAV call.
    function testGas_PostNAV() public {
        vm.prank(admin);
        uint256 gasStart = gasleft();
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used: postNAV", gasUsed);
        // Appending a struct to a dynamic array typically ~50-80k
        assertLt(gasUsed, 120_000, "postNAV gas exceeds expected ceiling");
    }

    /// Measure gas for latestNAV view call (off-chain RPC is free, but useful to track).
    function testGas_LatestNAV() public {
        vm.prank(admin);
        nav.postNAV(SAMPLE_NAV, SAMPLE_ASOF);

        uint256 gasStart = gasleft();
        nav.latestNAV();
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used: latestNAV view", gasUsed);
        assertLt(gasUsed, 30_000, "latestNAV view gas exceeds expected ceiling");
    }

    /// Fuzz: any positive nav and asOf can be posted and read back accurately.
    function testFuzz_PostAndReadBack(uint128 navVal, uint48 asOfVal) public {
        vm.assume(navVal > 0);
        vm.assume(asOfVal > 0);

        vm.prank(admin);
        nav.postNAV(navVal, asOfVal);

        NAVRegistry.NavRecord memory rec = nav.latestNAV();
        assertEq(rec.nav,  navVal);
        assertEq(rec.asOf, asOfVal);
    }
}
