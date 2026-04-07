// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {FundToken} from "./FundToken.sol";
import {NAVRegistry} from "./NAVRegistry.sol";

/**
 * OTCTrade — bilateral OTC trade contract.
 *
 * A proposer (acting on behalf of a seller) registers trade terms on-chain.
 * Anyone can attempt settlement; the contract enforces two conditions atomically:
 *
 *   Sell-side: seller must hold >= amount tokens at settlement time.
 *   Buy-side:  the latest on-chain NAV must be >= navFloor set in the trade.
 *
 * On success the contract burns tokens from the seller and mints them to the
 * buyer, using the REDEMPTION_ROLE and SUBSCRIPTION_ROLE it holds on FundToken.
 *
 * Three outcomes are possible:
 *   1. Both conditions met   → Trade.status = Settled
 *   2. Seller lacks tokens   → revert "SELLER_INSUFFICIENT_BALANCE"
 *   3. NAV below floor       → revert "NAV_BELOW_FLOOR"
 */
contract OTCTrade {
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
    }

    // ── Propose ─────────────────────────────────────────────────────────────
    /**
     * Register a new trade proposal. The caller acts as settlement agent and
     * specifies explicit seller/buyer addresses.
     *
     * @param seller    Address that will give up tokens.
     * @param buyer     Address that will receive tokens.
     * @param amount    Number of OTCF token units to transfer.
     * @param navFloor  Minimum NAV value (scaled ×1e6) required at settlement.
     *                  Represents the buy-side credit condition: if NAV is
     *                  below this value, the buyer is considered unable to
     *                  meet the trade terms.
     */
    function propose(
        address seller,
        address buyer,
        uint256 amount,
        uint256 navFloor
    ) external returns (uint256 id) {
        require(amount > 0,               "ZERO_AMOUNT");
        require(seller != address(0),     "INVALID_SELLER");
        require(buyer  != address(0),     "INVALID_BUYER");
        require(buyer  != seller,         "SAME_COUNTERPARTY");

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
     * Attempt to settle a pending trade.
     *
     * Enforces both conditions atomically:
     *  1. Sell-side: seller balance >= amount        (SELLER_INSUFFICIENT_BALANCE)
     *  2. Buy-side:  latestNAV.nav   >= trade.navFloor  (NAV_BELOW_FLOOR)
     *
     * On success: burns tokens from seller and mints to buyer.
     */
    function settle(uint256 id) external {
        Trade storage t = trades[id];
        require(t.status == Status.Pending, "NOT_PENDING");

        // ── Sell-side condition ──────────────────────────────────────────────
        // Scenario 2 fails here: seller doesn't hold enough tokens
        require(
            token.balanceOf(t.seller) >= t.amount,
            "SELLER_INSUFFICIENT_BALANCE"
        );

        // ── Buy-side condition ───────────────────────────────────────────────
        // Scenario 3 fails here: NAV is below the floor set in trade terms
        NAVRegistry.NavRecord memory nav = navRegistry.latestNAV();
        require(nav.nav >= t.navFloor, "NAV_BELOW_FLOOR");

        // ── Settlement ───────────────────────────────────────────────────────
        // Scenario 1 reaches here: both conditions satisfied
        t.status = Status.Settled;

        token.burnFrom(t.seller, t.amount);   // requires REDEMPTION_ROLE
        token.mint(t.buyer,   t.amount);      // requires SUBSCRIPTION_ROLE

        emit TradeSettled(id, nav.nav, t.seller, t.buyer, t.amount);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────
    /**
     * Cancel a pending trade. Only callable by seller or buyer.
     */
    function cancel(uint256 id, string calldata reason) external {
        Trade storage t = trades[id];
        require(t.status == Status.Pending, "NOT_PENDING");
        require(
            msg.sender == t.seller || msg.sender == t.buyer,
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
