// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "openzeppelin/access/AccessControl.sol";
import {FundToken} from "./FundToken.sol";
import {NAVRegistry} from "./NAVRegistry.sol";

/**
 * OTCTrade — bilateral OTC trade contract with role-based access control.
 *
 * Only addresses holding SETTLEMENT_AGENT_ROLE may propose or settle trades.
 * This prevents arbitrary third parties from registering trades against any
 * seller/buyer or forcing settlement without authorization.
 *
 * Phase 1: settlement agent attests off-chain seller consent before proposing.
 * Phase 2: replace with on-chain EIP-712 seller signature in propose().
 *
 * Three settlement outcomes are possible:
 *   1. Both conditions met   → Trade.status = Settled
 *   2. Seller lacks tokens   → revert "SELLER_INSUFFICIENT_BALANCE"
 *   3. NAV below floor       → revert "NAV_BELOW_FLOOR"
 */
contract OTCTrade is AccessControl {
    bytes32 public constant SETTLEMENT_AGENT_ROLE = keccak256("SETTLEMENT_AGENT_ROLE");

    // NAV must have been posted within this window for settlement to proceed
    uint256 public constant MAX_NAV_AGE = 24 hours;

    // ── Types ───────────────────────────────────────────────────────────────
    enum Status { Pending, Settled, Cancelled }

    struct Trade {
        address seller;
        address buyer;
        uint256 amount;    // OTCF token units to transfer
        uint256 navFloor;  // minimum NAV (scaled ×1e6) required to settle
        Status  status;
    }

    // ── State ───────────────────────────────────────────────────────────────
    FundToken   public immutable token;
    NAVRegistry public immutable navRegistry;

    uint256 public tradeCount;
    mapping(uint256 => Trade) public trades;

    // ── Events ──────────────────────────────────────────────────────────────
    event TradeProposed(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 navFloor
    );

    event TradeSettled(
        uint256 indexed id,
        uint256 navAtSettlement,
        address seller,
        address buyer,
        uint256 amount
    );

    event TradeCancelled(uint256 indexed id, string reason);

    // ── Constructor ─────────────────────────────────────────────────────────
    constructor(address _token, address _navRegistry) {
        token       = FundToken(_token);
        navRegistry = NAVRegistry(_navRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SETTLEMENT_AGENT_ROLE, msg.sender);
    }

    // ── Propose ─────────────────────────────────────────────────────────────
    /**
     * Register a new trade proposal. Restricted to SETTLEMENT_AGENT_ROLE.
     * The agent is responsible for obtaining and recording off-chain seller
     * consent before calling this function (Phase 1). On-chain EIP-712
     * seller signature verification will be added in Phase 2.
     */
    function propose(
        address seller,
        address buyer,
        uint256 amount,
        uint256 navFloor
    ) external onlyRole(SETTLEMENT_AGENT_ROLE) returns (uint256 id) {
        require(amount > 0,           "ZERO_AMOUNT");
        require(seller != address(0), "INVALID_SELLER");
        require(buyer  != address(0), "INVALID_BUYER");
        require(buyer  != seller,     "SAME_COUNTERPARTY");

        id = tradeCount++;
        trades[id] = Trade({
            seller:   seller,
            buyer:    buyer,
            amount:   amount,
            navFloor: navFloor,
            status:   Status.Pending
        });

        emit TradeProposed(id, seller, buyer, amount, navFloor);
    }

    // ── Settle ──────────────────────────────────────────────────────────────
    /**
     * Attempt to settle a pending trade. Restricted to SETTLEMENT_AGENT_ROLE.
     *
     * Enforces both conditions atomically:
     *  1. Sell-side: seller balance >= amount        (SELLER_INSUFFICIENT_BALANCE)
     *  2. Buy-side:  latestNAV.nav   >= trade.navFloor  (NAV_BELOW_FLOOR)
     *
     * On success: burns tokens from seller and mints to buyer.
     */
    function settle(uint256 id) external onlyRole(SETTLEMENT_AGENT_ROLE) {
        Trade storage t = trades[id];
        require(t.status == Status.Pending, "NOT_PENDING");

        require(
            token.balanceOf(t.seller) >= t.amount,
            "SELLER_INSUFFICIENT_BALANCE"
        );

        NAVRegistry.NavRecord memory nav = navRegistry.latestNAV();
        require(block.timestamp - nav.storedAt <= MAX_NAV_AGE, "STALE_NAV");
        require(nav.nav >= t.navFloor, "NAV_BELOW_FLOOR");

        // State update before external calls (checks-effects-interactions)
        t.status = Status.Settled;

        token.burnFrom(t.seller, t.amount);
        token.mint(t.buyer,   t.amount);

        emit TradeSettled(id, nav.nav, t.seller, t.buyer, t.amount);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────
    /**
     * Cancel a pending trade. Callable by the seller, buyer, or any
     * settlement agent — so either counterparty or the platform can cancel.
     */
    function cancel(uint256 id, string calldata reason) external {
        Trade storage t = trades[id];
        require(t.status == Status.Pending, "NOT_PENDING");
        require(
            msg.sender == t.seller ||
            msg.sender == t.buyer  ||
            hasRole(SETTLEMENT_AGENT_ROLE, msg.sender),
            "UNAUTHORIZED"
        );

        t.status = Status.Cancelled;
        emit TradeCancelled(id, reason);
    }

    // ── View ─────────────────────────────────────────────────────────────────
    function getTrade(uint256 id) external view returns (Trade memory) {
        return trades[id];
    }
}
