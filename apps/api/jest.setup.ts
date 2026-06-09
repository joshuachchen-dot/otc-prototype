// Populate env vars required by env.ts before any module is loaded in tests.
// Values use Anvil's well-known default accounts/addresses — safe for unit tests.
//
// IMPORTANT: RPC_URL intentionally points to a closed port. Tests that need
// chain calls must mock '../src/chain' so the real viem client is never used.
// Using localhost:8545 here causes tests to pass accidentally when a local
// Anvil node happens to be running, masking missing mocks.
process.env.RPC_URL = 'http://localhost:19999';
process.env.PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.FUND_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
process.env.NAV_REGISTRY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
process.env.OTC_TRADE_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
