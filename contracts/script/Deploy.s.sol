// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {FundToken} from "src/FundToken.sol";
import {NAVRegistry} from "src/NAVRegistry.sol";
import {OTCTrade} from "src/OTCTrade.sol";

contract Deploy is Script {
    function run() external {
        address admin = vm.envAddress("DEPLOYER");
        vm.startBroadcast();

        // Deploy core contracts
        FundToken   token = new FundToken(admin, "OTC Fund", "OTCF");
        NAVRegistry nav   = new NAVRegistry(admin);

        // Grant admin roles so the API (running as deployer) can mint/burn/post
        token.grantRole(token.SUBSCRIPTION_ROLE(), admin);
        token.grantRole(token.REDEMPTION_ROLE(), admin);

        // Deploy OTCTrade and grant it the roles it needs to settle trades
        OTCTrade otc = new OTCTrade(address(token), address(nav));
        token.grantRole(token.SUBSCRIPTION_ROLE(), address(otc));
        token.grantRole(token.REDEMPTION_ROLE(), address(otc));

        vm.stopBroadcast();

        console2.log("FundToken:", address(token));
        console2.log("NAVRegistry:", address(nav));
        console2.log("OTCTrade:", address(otc));
    }
}
