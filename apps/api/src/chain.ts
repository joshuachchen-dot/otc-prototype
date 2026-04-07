// apps/api/src/chain.ts
import { createWalletClient, createPublicClient, getContract, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { ENV } from './env';

export const account = privateKeyToAccount(ENV.PRIVATE_KEY as `0x${string}`);

export const rpc = createPublicClient({
  chain: foundry,
  transport: http(ENV.RPC_URL),
});

export const wallet = createWalletClient({
  account,
  chain: foundry,
  transport: http(ENV.RPC_URL),
});

const client = { public: rpc, wallet };

// NAV contract
export const nav = getContract({
  address: ENV.NAV_REGISTRY_ADDRESS as `0x${string}`,
  abi: parseAbi([
    'function postNAV(uint256 nav, uint256 asOf) external',
    'function latestNAV() view returns (uint256 nav, uint256 asOf, uint256 storedAt)',
    'event NavPosted(uint256 nav, uint256 asOf, uint256 storedAt, address indexed by)',
  ]),
  client,
});

// Token contract
export const token = getContract({
  address: ENV.FUND_TOKEN_ADDRESS as `0x${string}`,
  abi: parseAbi([
    'function mint(address to, uint256 amount) external',
    'function burnFrom(address from, uint256 amount) external',
    'function balanceOf(address a) view returns (uint256)',
    'function setWhitelisted(address a, bool ok) external',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]),
  client,
});

// OTCTrade contract
export const otcTrade = getContract({
  address: ENV.OTC_TRADE_ADDRESS as `0x${string}`,
  abi: parseAbi([
    'function propose(address seller, address buyer, uint256 amount, uint256 navFloor) external returns (uint256)',
    'function settle(uint256 id) external',
    'function cancel(uint256 id, string reason) external',
    'function getTrade(uint256 id) view returns (address seller, address buyer, uint256 amount, uint256 navFloor, uint8 status)',
    'function tradeCount() view returns (uint256)',
    'event TradeProposed(uint256 indexed id, address indexed seller, address indexed buyer, uint256 amount, uint256 navFloor)',
    'event TradeSettled(uint256 indexed id, uint256 navAtSettlement, address seller, address buyer, uint256 amount)',
    'event TradeCancelled(uint256 indexed id, string reason)',
  ]),
  client,
});
