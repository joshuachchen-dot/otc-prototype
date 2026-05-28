// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {FundToken} from "src/FundToken.sol";

/**
 * @title  FundToken comprehensive test suite
 * @notice Covers mint, burn, access control, whitelist enforcement,
 *         pause mechanics, and per-operation gas benchmarks.
 */
contract FundTokenTest is Test {
    FundToken token;

    address admin  = address(this);        // test contract holds admin role
    address alice  = address(0xA11CE);     // whitelisted investor
    address bob    = address(0xB0B);       // NOT whitelisted
    address hacker = address(0xBAD);       // no roles

    uint256 constant ONE_TOKEN = 1e18;

    /* ─────────────────────────────── setup ─────────────────────────────── */

    function setUp() public {
        token = new FundToken(admin, "OTC Fund", "OTCF");

        // Grant operational roles to admin (mirrors Deploy.s.sol)
        token.grantRole(token.SUBSCRIPTION_ROLE(), admin);
        token.grantRole(token.REDEMPTION_ROLE(),   admin);

        // Whitelist alice (not bob)
        token.setWhitelisted(alice, true);
    }

    /* ═══════════════════════════ MINT TESTS ════════════════════════════ */

    /// Minting to a whitelisted address increases totalSupply and balance.
    function testMint_BasicIncreasesBalance() public {
        token.mint(alice, ONE_TOKEN);
        assertEq(token.balanceOf(alice), ONE_TOKEN, "balance should equal minted amount");
        assertEq(token.totalSupply(),    ONE_TOKEN, "total supply should equal minted amount");
    }

    /// Minting multiple times accumulates correctly.
    function testMint_MultipleMints() public {
        token.mint(alice, ONE_TOKEN);
        token.mint(alice, 2 * ONE_TOKEN);
        assertEq(token.balanceOf(alice), 3 * ONE_TOKEN);
    }

    /// Minting to an un-whitelisted address is permitted — whitelist only governs p2p transfers.
    function testMint_AllowsNonWhitelistedRecipient() public {
        token.mint(bob, ONE_TOKEN);
        assertEq(token.balanceOf(bob), ONE_TOKEN, "mint to non-whitelisted should succeed");
    }

    /// Only SUBSCRIPTION_ROLE may call mint.
    function testMint_RevertsForUnauthorizedCaller() public {
        vm.prank(hacker);
        vm.expectRevert();   // AccessControl revert
        token.mint(alice, ONE_TOKEN);
    }

    /// Minting zero tokens is a no-op (totalSupply unchanged).
    function testMint_ZeroAmount() public {
        token.mint(alice, 0);
        assertEq(token.totalSupply(), 0);
    }

    /* ═══════════════════════════ BURN TESTS ════════════════════════════ */

    /// BurnFrom reduces balance and totalSupply correctly.
    function testBurn_BasicDecreasesBalance() public {
        token.mint(alice, ONE_TOKEN);
        token.burnFrom(alice, ONE_TOKEN);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.totalSupply(),    0);
    }

    /// Partial burn leaves the remainder intact.
    function testBurn_Partial() public {
        token.mint(alice, 4 * ONE_TOKEN);
        token.burnFrom(alice, ONE_TOKEN);
        assertEq(token.balanceOf(alice), 3 * ONE_TOKEN);
    }

    /// Burning more than the balance must revert.
    function testBurn_OverBurnReverts() public {
        token.mint(alice, ONE_TOKEN);
        vm.expectRevert();   // ERC20 underflow
        token.burnFrom(alice, 2 * ONE_TOKEN);
    }

    /// Only REDEMPTION_ROLE may call burnFrom.
    function testBurn_RevertsForUnauthorizedCaller() public {
        token.mint(alice, ONE_TOKEN);
        vm.prank(hacker);
        vm.expectRevert();
        token.burnFrom(alice, ONE_TOKEN);
    }

    /* ══════════════════════ WHITELIST ENFORCEMENT ══════════════════════ */

    /// P2P transfer to a non-whitelisted address must revert.
    function testWhitelist_P2PTransferToNonWhitelistedReverts() public {
        token.mint(alice, ONE_TOKEN);
        vm.prank(alice);
        vm.expectRevert("RECEIVER_NOT_WHITELISTED");
        token.transfer(bob, ONE_TOKEN);
    }

    /// P2P transfer between two whitelisted addresses succeeds.
    function testWhitelist_P2PTransferBetweenWhitelistedSucceeds() public {
        token.setWhitelisted(bob, true);
        token.mint(alice, ONE_TOKEN);
        vm.prank(alice);
        token.transfer(bob, ONE_TOKEN);
        assertEq(token.balanceOf(bob),   ONE_TOKEN);
        assertEq(token.balanceOf(alice), 0);
    }

    /// Admin can revoke whitelist and subsequent transfers then revert.
    function testWhitelist_RevokeBlocksTransfer() public {
        token.setWhitelisted(bob, true);
        token.mint(alice, ONE_TOKEN);
        // revoke bob
        token.setWhitelisted(bob, false);
        vm.prank(alice);
        vm.expectRevert("RECEIVER_NOT_WHITELISTED");
        token.transfer(bob, ONE_TOKEN);
    }

    /// Only DEFAULT_ADMIN_ROLE may call setWhitelisted.
    function testWhitelist_OnlyAdminCanSet() public {
        vm.prank(hacker);
        vm.expectRevert();
        token.setWhitelisted(alice, false);
    }

    /* ════════════════════════ PAUSE MECHANICS ══════════════════════════ */

    /// Pause blocks mint.
    function testPause_BlocksMint() public {
        token.pause();
        vm.expectRevert("PAUSED");
        token.mint(alice, ONE_TOKEN);
    }

    /// Pause blocks burnFrom.
    function testPause_BlocksBurn() public {
        token.mint(alice, ONE_TOKEN);   // mint before pause
        token.pause();
        vm.expectRevert("PAUSED");
        token.burnFrom(alice, ONE_TOKEN);
    }

    /// Pause blocks p2p transfers.
    function testPause_BlocksTransfer() public {
        token.setWhitelisted(bob, true);
        token.mint(alice, ONE_TOKEN);
        token.pause();
        vm.prank(alice);
        vm.expectRevert("PAUSED");
        token.transfer(bob, ONE_TOKEN);
    }

    /// Unpause restores normal operation.
    function testPause_UnpauseRestoresOperation() public {
        token.pause();
        token.unpause();
        token.mint(alice, ONE_TOKEN);   // should succeed
        assertEq(token.balanceOf(alice), ONE_TOKEN);
    }

    /// Only PAUSER_ROLE may pause.
    function testPause_OnlyPauserCanPause() public {
        vm.prank(hacker);
        vm.expectRevert();
        token.pause();
    }

    /* ═════════════════════════ GAS BENCHMARKS ══════════════════════════ */

    /// Records gas consumed by a single mint call and asserts a ceiling.
    function testGas_Mint() public {
        uint256 gasStart = gasleft();
        token.mint(alice, ONE_TOKEN);
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used: mint(alice, 1e18)", gasUsed);
        // ERC20 mint is typically 50-70k gas; set ceiling at 120k
        assertLt(gasUsed, 120_000, "mint gas exceeds expected ceiling");
    }

    /// Records gas consumed by a burnFrom call.
    function testGas_BurnFrom() public {
        token.mint(alice, ONE_TOKEN);
        uint256 gasStart = gasleft();
        token.burnFrom(alice, ONE_TOKEN);
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used: burnFrom(alice, 1e18)", gasUsed);
        assertLt(gasUsed, 80_000, "burnFrom gas exceeds expected ceiling");
    }

    /// Records gas for mint followed immediately by burnFrom (round-trip).
    function testGas_SubscribeRedeemRoundTrip() public {
        uint256 gasStart = gasleft();
        token.mint(alice, ONE_TOKEN);
        token.burnFrom(alice, ONE_TOKEN);
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used: mint + burnFrom round-trip", gasUsed);
        assertLt(gasUsed, 200_000, "round-trip gas exceeds expected ceiling");
    }

    /// Fuzz: any valid amount minted then fully burned leaves zero balance.
    function testFuzz_MintThenBurnLeavesZero(uint96 amount) public {
        vm.assume(amount > 0);
        token.mint(alice, amount);
        token.burnFrom(alice, amount);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.totalSupply(),    0);
    }
}
