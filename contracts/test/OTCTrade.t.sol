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
    address buyer  = address(0x2);

    // Seller is a keyed account so we can produce EIP-712 signatures
    uint256 sellerKey = 0xA11CE;
    address seller;

    uint256 constant AMOUNT    = 500e18;
    uint256 constant NAV_FLOOR = 2_000_000_000;
    uint256 constant NAV_GOOD  = 3_000_000_000;

    function setUp() public {
        seller = vm.addr(sellerKey);

        token = new FundToken(admin, "OTC Fund", "OTCF");
        nav   = new NAVRegistry(admin);
        otc   = new OTCTrade(address(token), address(nav));

        token.grantRole(token.SUBSCRIPTION_ROLE(), admin);
        token.grantRole(token.REDEMPTION_ROLE(),   admin);
        token.grantRole(token.REDEMPTION_ROLE(),   address(otc));
        token.grantRole(token.SUBSCRIPTION_ROLE(), address(otc));

        token.setWhitelisted(seller, true);
        token.setWhitelisted(buyer,  true);

        token.mint(seller, AMOUNT);
        nav.postNAV(NAV_GOOD, block.timestamp);
    }

    // ── EIP-712 helpers ──────────────────────────────────────────────────────

    function _sign(
        address _seller,
        address _buyer,
        uint256 amount,
        uint256 navFloor,
        uint256 nonce,
        uint256 deadline,
        uint256 privateKey
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(abi.encode(
            otc.PROPOSE_TYPEHASH(),
            _seller,
            _buyer,
            amount,
            navFloor,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            otc.DOMAIN_SEPARATOR(),
            structHash
        ));
        (v, r, s) = vm.sign(privateKey, digest);
    }

    function _propose(uint256 navFloor) internal returns (uint256 id) {
        uint256 nonce    = otc.nonces(seller);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(seller, buyer, AMOUNT, navFloor, nonce, deadline, sellerKey);
        id = otc.propose(seller, buyer, AMOUNT, navFloor, nonce, deadline, v, r, s);
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    function testSettle_SuccessfulSettlement() public {
        uint256 id = _propose(NAV_FLOOR);
        otc.settle(id);

        OTCTrade.Trade memory t = otc.getTrade(id);
        assertEq(uint8(t.status), uint8(OTCTrade.Status.Settled));
        assertEq(token.balanceOf(seller), 0);
        assertEq(token.balanceOf(buyer),  AMOUNT);
    }

    // ── EIP-712 signature guards ─────────────────────────────────────────────

    function testPropose_RevertsOnWrongSigner() public {
        uint256 wrongKey = 0xBAD;
        uint256 nonce    = otc.nonces(seller);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, wrongKey);

        vm.expectRevert("INVALID_SELLER_SIGNATURE");
        otc.propose(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, v, r, s);
    }

    function testPropose_RevertsOnExpiredDeadline() public {
        uint256 nonce    = otc.nonces(seller);
        uint256 deadline = block.timestamp - 1; // already expired
        (uint8 v, bytes32 r, bytes32 s) = _sign(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, sellerKey);

        vm.expectRevert("SIGNATURE_EXPIRED");
        otc.propose(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, v, r, s);
    }

    function testPropose_RevertsOnReplayedNonce() public {
        // First proposal consumes nonce 0
        _propose(NAV_FLOOR);

        // Replay the same nonce — should fail
        uint256 nonce    = 0; // stale nonce
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, sellerKey);

        vm.expectRevert("INVALID_NONCE");
        otc.propose(seller, buyer, AMOUNT, NAV_FLOOR, nonce, deadline, v, r, s);
    }

    function testPropose_NonceIncrementsAfterPropose() public {
        assertEq(otc.nonces(seller), 0);
        _propose(NAV_FLOOR);
        assertEq(otc.nonces(seller), 1);
    }

    // ── Staleness guard ──────────────────────────────────────────────────────

    function testSettle_RevertsOnStaleNAV() public {
        uint256 id = _propose(NAV_FLOOR);
        vm.warp(block.timestamp + otc.MAX_NAV_AGE() + 1);
        vm.expectRevert("STALE_NAV");
        otc.settle(id);
    }

    function testSettle_SucceedsWithFreshNAVAfterWarp() public {
        uint256 id = _propose(NAV_FLOOR);
        vm.warp(block.timestamp + otc.MAX_NAV_AGE() + 1);
        nav.postNAV(NAV_GOOD, block.timestamp);
        otc.settle(id);
        assertEq(uint8(otc.getTrade(id).status), uint8(OTCTrade.Status.Settled));
    }

    // ── Trade TTL guard ──────────────────────────────────────────────────────

    function testSettle_RevertsOnExpiredTrade() public {
        uint256 id = _propose(NAV_FLOOR);
        // Warp past trade TTL; post a fresh NAV so only TRADE_EXPIRED fires
        vm.warp(block.timestamp + otc.MAX_TRADE_AGE() + 1);
        nav.postNAV(NAV_GOOD, block.timestamp);
        vm.expectRevert("TRADE_EXPIRED");
        otc.settle(id);
    }

    function testSettle_SucceedsJustBeforeTradeExpiry() public {
        uint256 id = _propose(NAV_FLOOR);
        vm.warp(block.timestamp + otc.MAX_TRADE_AGE() - 1);
        nav.postNAV(NAV_GOOD, block.timestamp);
        otc.settle(id);
        assertEq(uint8(otc.getTrade(id).status), uint8(OTCTrade.Status.Settled));
    }

    // ── NAV floor guard ──────────────────────────────────────────────────────

    function testSettle_RevertsWhenNAVBelowFloor() public {
        nav.postNAV(1_500_000_000, block.timestamp);
        uint256 id = _propose(NAV_FLOOR);
        vm.expectRevert("NAV_BELOW_FLOOR");
        otc.settle(id);
    }

    // ── Seller balance guard ─────────────────────────────────────────────────

    function testSettle_RevertsOnInsufficientSellerBalance() public {
        token.burnFrom(seller, AMOUNT - 100e18);
        uint256 id = _propose(NAV_FLOOR);
        vm.expectRevert("SELLER_INSUFFICIENT_BALANCE");
        otc.settle(id);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    function testCancel_ByAgent() public {
        uint256 id = _propose(NAV_FLOOR);
        otc.cancel(id, "test cancel");
        assertEq(uint8(otc.getTrade(id).status), uint8(OTCTrade.Status.Cancelled));
    }

    function testSettle_RevertsOnCancelledTrade() public {
        uint256 id = _propose(NAV_FLOOR);
        otc.cancel(id, "cancelled");
        vm.expectRevert("NOT_PENDING");
        otc.settle(id);
    }
}
