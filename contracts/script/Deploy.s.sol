// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AmongUsGameFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 feePercentage = vm.envOr("FEE_PERCENTAGE", uint256(500)); // Default 5%

        vm.startBroadcast(deployerPrivateKey);

        // Deploy factory (which also deploys WagerVault and AgentRegistry)
        AmongUsGameFactory factory = new AmongUsGameFactory(feeRecipient, feePercentage);

        console.log("=== Deployment Complete ===");
        console.log("Factory:", address(factory));
        console.log("WagerVault:", address(factory.wagerVault()));
        console.log("AgentRegistry:", address(factory.agentRegistry()));
        console.log("Fee Recipient:", feeRecipient);
        console.log("Fee Percentage:", feePercentage, "basis points");

        vm.stopBroadcast();
    }
}

contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Use deployer as fee recipient for testnet
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        AmongUsGameFactory factory = new AmongUsGameFactory(deployer, 500);

        console.log("=== Testnet Deployment ===");
        console.log("Factory:", address(factory));
        console.log("WagerVault:", address(factory.wagerVault()));
        console.log("AgentRegistry:", address(factory.agentRegistry()));

        // Set lower wager for testnet
        GameConfig memory testConfig = GameConfig({
            minPlayers: 4,
            maxPlayers: 10,
            numImpostors: 1,
            wagerAmount: 0.001 ether, // Lower for testnet
            actionTimeout: 120,
            voteTimeout: 90,
            discussionTime: 60,
            tasksPerPlayer: 3,
            visualTasks: true,
            emergencyMeetings: 1,
            killCooldown: 2
        });

        factory.setDefaultConfig(testConfig);
        console.log("Default config set with wager:", testConfig.wagerAmount);

        vm.stopBroadcast();
    }
}
