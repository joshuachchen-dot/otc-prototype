// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "openzeppelin/access/AccessControl.sol";
import {FundToken} from "./FundToken.sol";
import {NAVRegistry} from "./NAVRegistry.sol";

/**
 * OTCTrade — bilateral OTC trade contract with role-based access control
 * and EIP-712 seller consent signatures.
 *
 * Phase 2: propose() requires a valid EIP-712 signature from the seller,
 * proving on-chain that they consented to the trade before it was registered.
 *
 * Settlement enforces four conditions atomically:
 *   1. Trade is Pending
 *   2. Trade has not expired (MAX_TRADE_AGE)
 *   3. Seller balance >= amount
 *   4. NAV is fresh (<= MAX_NAV_AGE) and >= navFloor
 */
contract OTCTrade is AccessControl {
    bytes32 public constant SETTLEMENT_AGENT_ROLE = keccak256("SETTLEMENT_AGENT_ROLE");

    uint256 public constant MAX_NAV_AGE   = 24 hours;
    uint256 public constant MAX_TRADE_AGE = 7 days;

    // ── EIP-712 ─────────────────────────────────────────────────────────────
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant PROPOSE_TYPEHASH = keccak256(
        "ProposeTrade(address seller,address buyer,uint256 amount,uint256 navFloor,uint256 nonce,uint256 deadline)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;

    // ── Types ───────────────────────────────────────────────────────────────
    enum Status { Pending, Settled, Cancelled }

    struct Trade {
        address seller;
        address buyer;
        uint256 amount;
        uint256 navFloor;
        uint256 proposedAt;
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

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("OTCTrade"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // ── Propose ─────────────────────────────────────────────────────────────
    /**
     * Register a trade proposal. Restricted to SETTLEMENT_AGENT_ROLE.
     * Requires a valid EIP-712 signature from the seller over the trade
     * parameters, a nonce (replay protection), and a deadline.
     *
     * @param seller   Token seller
     * @param buyer    Token buyer
     * @param amount   OTCF units to transfer
     * @param navFloor Minimum NAV (×1e6) at settlement
     * @param nonce    Seller's current nonce (fetch via nonces(seller))
     * @param deadline Unix timestamp after which the signature is invalid
     * @param v        Signature component
     * @param r        Signature component
     * @param s        Signature component
     */
    function propose(
        address seller,
        address buyer,
        uint256 amount,
        uint256 navFloor,
        uint256 nonce,
        uint256 deadline,
        uint8   v,
        bytes32 r,
        bytes32 s
    ) external onlyRole(SETTLEMENT_AGENT_ROLE) returns (uint256 id) {
        require(amount > 0,              "ZERO_AMOUNT");
        require(seller != address(0),    "INVALID_SELLER");
        require(buyer  != address(0),    "INVALID_BUYER");
        require(buyer  != seller,        "SAME_COUNTERPARTY");
        require(block.timestamp <= deadline, "SIGNATURE_EXPIRED");
        require(nonces[seller] == nonce,     "INVALID_NONCE");

        // Verify seller's EIP-712 signature
        bytes32 structHash = keccak256(abi.encode(
            PROPOSE_TYPEHASH,
            seller,
            buyer,
            amount,
            navFloor,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0) && recovered == seller, "INVALID_SELLER_SIGNATURE");

        nonces[seller]++;

        id = tradeCount++;
        trades[id] = Trade({
            seller:     seller,
            buyer:      buyer,
            amount:     amount,
            navFloor:   navFloor,
            proposedAt: block.timestamp,
            status:     Status.Pending
        });

        emit TradeProposed(id, seller, buyer, amount, navFloor);
    }

    // ── Settle ──────────────────────────────────────────────────────────────
    /**
     * Settle a pending trade. Restricted to SETTLEMENT_AGENT_ROLE.
     * Enforces four conditions atomically:
     *   1. Status == Pending
     *   2. Trade not expired (MAX_TRADE_AGE = 7 days)
     *   3. Seller balance >= amount
     *   4. NAV is fresh (<= MAX_NAV_AGE) and >= navFloor
     */
    function settle(uint256 id) external onlyRole(SETTLEMENT_AGENT_ROLE) {
        Trade storage t = trades[id];
        require(t.status == Status.Pending, "NOT_PENDING");
        require(block.timestamp - t.proposedAt <= MAX_TRADE_AGE, "TRADE_EXPIRED");

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
        token.mint(t.buyer, t.amount);

        emit TradeSettled(id, nav.nav, t.seller, t.buyer, t.amount);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────
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
