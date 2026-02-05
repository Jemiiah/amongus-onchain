// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AmongUsGameFactory.sol";
import "../src/AmongUsGame.sol";
import "../src/WagerVault.sol";
import "../src/AgentRegistry.sol";
import "../src/GameTypes.sol";

contract AmongUsGameTest is Test {
    AmongUsGameFactory public factory;
    WagerVault public vault;
    AgentRegistry public registry;

    address public owner = address(1);
    address public feeRecipient = address(2);

    address public player1 = address(10);
    address public player2 = address(11);
    address public player3 = address(12);
    address public player4 = address(13);
    address public player5 = address(14);
    address public player6 = address(15);

    uint256 public constant WAGER = 0.01 ether;

    function setUp() public {
        vm.prank(owner);
        factory = new AmongUsGameFactory(feeRecipient, 500); // 5% fee

        vault = factory.wagerVault();
        registry = factory.agentRegistry();

        // Fund players
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(player3, 10 ether);
        vm.deal(player4, 10 ether);
        vm.deal(player5, 10 ether);
        vm.deal(player6, 10 ether);
    }

    function test_CreateGame() public {
        vm.prank(player1);
        (uint256 gameId, address gameAddress) = factory.createGame{value: WAGER}();

        assertEq(gameId, 0);
        assertTrue(gameAddress != address(0));

        // Check game is in active list
        uint256[] memory activeGames = factory.getActiveGames();
        assertEq(activeGames.length, 1);
        assertEq(activeGames[0], 0);
    }

    function test_JoinGame() public {
        // Create game
        vm.prank(player1);
        (uint256 gameId, address gameAddress) = factory.createGame{value: WAGER}();

        // Join game
        vm.prank(player2);
        factory.joinGame{value: WAGER}(gameId, 1);

        vm.prank(player3);
        factory.joinGame{value: WAGER}(gameId, 2);

        vm.prank(player4);
        factory.joinGame{value: WAGER}(gameId, 3);

        // Check player count
        AmongUsGame game = AmongUsGame(gameAddress);
        assertEq(game.getPlayerCount(), 4);

        // Check pool
        assertEq(vault.getGamePool(gameId), 4 * WAGER);
    }

    function test_StartGame() public {
        // Create and join game with 4 players
        vm.prank(player1);
        (uint256 gameId, address gameAddress) = factory.createGame{value: WAGER}();

        vm.prank(player2);
        factory.joinGame{value: WAGER}(gameId, 1);

        vm.prank(player3);
        factory.joinGame{value: WAGER}(gameId, 2);

        vm.prank(player4);
        factory.joinGame{value: WAGER}(gameId, 3);

        AmongUsGame game = AmongUsGame(gameAddress);

        // Start game
        vm.prank(player1);
        game.startGame();

        // Check phase changed to ActionCommit
        (
            ,
            GamePhase phase,
            ,
            ,
            uint8 alivePlayers,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
        ) = game.state();

        assertEq(uint8(phase), uint8(GamePhase.ActionCommit));
        assertEq(alivePlayers, 4);
    }

    function test_CommitRevealAction() public {
        // Setup game with 4 players
        vm.prank(player1);
        (uint256 gameId, address gameAddress) = factory.createGame{value: WAGER}();

        vm.prank(player2);
        factory.joinGame{value: WAGER}(gameId, 1);

        vm.prank(player3);
        factory.joinGame{value: WAGER}(gameId, 2);

        vm.prank(player4);
        factory.joinGame{value: WAGER}(gameId, 3);

        AmongUsGame game = AmongUsGame(gameAddress);

        vm.prank(player1);
        game.startGame();

        // Commit actions
        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");
        bytes32 salt3 = keccak256("salt3");
        bytes32 salt4 = keccak256("salt4");

        // Player 1: Move to Admin
        bytes32 hash1 = keccak256(abi.encodePacked(
            ActionType.Move,
            address(0),
            Location.Admin,
            uint8(0),
            SabotageType.None,
            salt1,
            player1
        ));

        // Player 2: Skip
        bytes32 hash2 = keccak256(abi.encodePacked(
            ActionType.Skip,
            address(0),
            Location.Cafeteria,
            uint8(0),
            SabotageType.None,
            salt2,
            player2
        ));

        // Player 3: Skip
        bytes32 hash3 = keccak256(abi.encodePacked(
            ActionType.Skip,
            address(0),
            Location.Cafeteria,
            uint8(0),
            SabotageType.None,
            salt3,
            player3
        ));

        // Player 4: Skip
        bytes32 hash4 = keccak256(abi.encodePacked(
            ActionType.Skip,
            address(0),
            Location.Cafeteria,
            uint8(0),
            SabotageType.None,
            salt4,
            player4
        ));

        vm.prank(player1);
        game.commitAction(hash1);

        vm.prank(player2);
        game.commitAction(hash2);

        vm.prank(player3);
        game.commitAction(hash3);

        vm.prank(player4);
        game.commitAction(hash4);

        // After all commits, phase should advance to reveal
        (, GamePhase phase, , , , , , , , , , , ) = game.state();
        assertEq(uint8(phase), uint8(GamePhase.ActionReveal));

        // Reveal actions
        vm.prank(player1);
        game.revealAction(ActionType.Move, address(0), Location.Admin, 0, SabotageType.None, salt1);

        vm.prank(player2);
        game.revealAction(ActionType.Skip, address(0), Location.Cafeteria, 0, SabotageType.None, salt2);

        vm.prank(player3);
        game.revealAction(ActionType.Skip, address(0), Location.Cafeteria, 0, SabotageType.None, salt3);

        vm.prank(player4);
        game.revealAction(ActionType.Skip, address(0), Location.Cafeteria, 0, SabotageType.None, salt4);

        // Check player1 moved to Admin
        (, , , Location loc, , , , , , ) = game.players(player1);
        assertEq(uint8(loc), uint8(Location.Admin));
    }

    function test_AgentRegistration() public {
        // Create game
        vm.prank(player1);
        factory.createGame{value: WAGER}();

        // Check agent registered
        assertTrue(registry.isRegistered(player1));

        // Check initial stats
        AgentRegistry.AgentStats memory stats = registry.getAgentStats(player1);
        assertEq(stats.rating, 1000); // Initial rating
        assertEq(stats.gamesPlayed, 0);
    }

    function test_LeaveGame() public {
        // Create game
        vm.prank(player1);
        (uint256 gameId, address gameAddress) = factory.createGame{value: WAGER}();

        vm.prank(player2);
        factory.joinGame{value: WAGER}(gameId, 1);

        uint256 balanceBefore = player2.balance;

        // Player 2 leaves
        vm.prank(player2);
        factory.leaveGame(gameId);

        // Check refund
        assertEq(player2.balance, balanceBefore + WAGER);

        // Check player count
        AmongUsGame game = AmongUsGame(gameAddress);
        assertEq(game.getPlayerCount(), 1);
    }

    function test_GetAdjacentRooms() public {
        vm.prank(player1);
        (, address gameAddress) = factory.createGame{value: WAGER}();

        AmongUsGame game = AmongUsGame(gameAddress);

        // Check Cafeteria connections
        Location[] memory adjacent = game.getAdjacentRooms(Location.Cafeteria);
        assertEq(adjacent.length, 3);
        assertEq(uint8(adjacent[0]), uint8(Location.Admin));
        assertEq(uint8(adjacent[1]), uint8(Location.MedBay));
        assertEq(uint8(adjacent[2]), uint8(Location.UpperEngine));
    }
}
