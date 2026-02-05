// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GameTypes.sol";
import "./AmongUsGame.sol";
import "./WagerVault.sol";
import "./AgentRegistry.sol";

/// @title AmongUsGameFactory - Creates and manages Among Us game instances
/// @notice Factory pattern for deploying new games with configurable settings
contract AmongUsGameFactory {
    // ============ STATE VARIABLES ============

    address public owner;
    WagerVault public wagerVault;
    AgentRegistry public agentRegistry;

    uint256 public gameCount;
    mapping(uint256 => address) public games; // gameId => game contract
    mapping(uint256 => GameConfig) public gameConfigs;

    // Active games tracking
    uint256[] public activeGameIds;
    mapping(uint256 => bool) public isActiveGame;
    mapping(uint256 => uint256) public activeGameIndex; // gameId => index in activeGameIds

    // Default configuration
    GameConfig public defaultConfig;

    // ============ EVENTS ============

    event GameCreated(
        uint256 indexed gameId,
        address indexed gameAddress,
        address indexed creator,
        uint256 wagerAmount
    );
    event GameEnded(uint256 indexed gameId, address indexed gameAddress);
    event DefaultConfigUpdated(GameConfig config);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _feeRecipient, uint256 _feePercentage) {
        owner = msg.sender;

        // Deploy WagerVault
        wagerVault = new WagerVault(_feeRecipient, _feePercentage);

        // Deploy AgentRegistry
        agentRegistry = new AgentRegistry();

        // Set default configuration
        defaultConfig = GameConfig({
            minPlayers: 4,
            maxPlayers: 10,
            numImpostors: 1,
            wagerAmount: 0.01 ether,
            actionTimeout: 60,      // 60 seconds
            voteTimeout: 45,        // 45 seconds
            discussionTime: 30,     // 30 seconds
            tasksPerPlayer: 3,
            visualTasks: true,
            emergencyMeetings: 1,
            killCooldown: 2         // 2 rounds
        });
    }

    // ============ GAME CREATION ============

    /// @notice Create a new game with default configuration
    function createGame() external payable returns (uint256 gameId, address gameAddress) {
        return createGameWithConfig(defaultConfig);
    }

    /// @notice Create a new game with custom configuration
    function createGameWithConfig(GameConfig memory _config) public payable returns (uint256 gameId, address gameAddress) {
        require(_config.minPlayers >= 4 && _config.minPlayers <= 10, "Invalid min players");
        require(_config.maxPlayers >= _config.minPlayers && _config.maxPlayers <= 15, "Invalid max players");
        require(_config.numImpostors >= 1 && _config.numImpostors <= 3, "Invalid impostor count");
        require(_config.numImpostors < _config.minPlayers / 2, "Too many impostors");
        require(msg.value >= _config.wagerAmount, "Insufficient wager");

        gameId = gameCount++;

        // Deploy new game contract
        AmongUsGame game = new AmongUsGame(
            gameId,
            msg.sender,
            address(wagerVault),
            _config
        );
        gameAddress = address(game);

        games[gameId] = gameAddress;
        gameConfigs[gameId] = _config;

        // Add to active games
        activeGameIndex[gameId] = activeGameIds.length;
        activeGameIds.push(gameId);
        isActiveGame[gameId] = true;

        emit GameCreated(gameId, gameAddress, msg.sender, _config.wagerAmount);

        // Auto-join creator
        if (msg.value >= _config.wagerAmount) {
            _joinGame(gameId, msg.sender, 0, msg.value);
        }

        // Refund excess
        if (msg.value > _config.wagerAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - _config.wagerAmount}("");
            require(success, "Refund failed");
        }

        return (gameId, gameAddress);
    }

    // ============ GAME MANAGEMENT ============

    /// @notice Join an existing game
    /// @param _gameId The game ID to join
    /// @param _colorId The color ID for the player (0-11)
    function joinGame(uint256 _gameId, uint8 _colorId) external payable {
        require(games[_gameId] != address(0), "Game not found");
        require(isActiveGame[_gameId], "Game not active");

        GameConfig memory config = gameConfigs[_gameId];
        require(msg.value >= config.wagerAmount, "Insufficient wager");

        _joinGame(_gameId, msg.sender, _colorId, config.wagerAmount);

        // Refund excess
        if (msg.value > config.wagerAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - config.wagerAmount}("");
            require(success, "Refund failed");
        }
    }

    /// @notice Leave a game before it starts
    /// @param _gameId The game ID
    function leaveGame(uint256 _gameId) external {
        require(games[_gameId] != address(0), "Game not found");

        AmongUsGame game = AmongUsGame(games[_gameId]);
        game.leaveGameFor(msg.sender);

        // Refund wager
        wagerVault.refund(_gameId, msg.sender);
    }

    /// @notice Settle a completed game
    /// @param _gameId The game ID
    function settleGame(uint256 _gameId) external {
        require(games[_gameId] != address(0), "Game not found");

        AmongUsGame game = AmongUsGame(games[_gameId]);
        require(game.isGameEnded(), "Game not ended");

        // Settle wagers
        wagerVault.settleGame(_gameId, games[_gameId]);

        // Update agent stats
        _updateAgentStats(_gameId);

        // Remove from active games
        _removeFromActiveGames(_gameId);

        emit GameEnded(_gameId, games[_gameId]);
    }

    /// @notice Cancel a game that hasn't started
    /// @param _gameId The game ID
    function cancelGame(uint256 _gameId) external {
        require(games[_gameId] != address(0), "Game not found");

        AmongUsGame game = AmongUsGame(games[_gameId]);
        GameState memory state = _getGameState(game);
        require(state.phase == GamePhase.Lobby, "Game already started");

        // Refund all players
        address[] memory players = game.getAllPlayers();
        wagerVault.emergencyRefund(_gameId, players);

        // Remove from active games
        _removeFromActiveGames(_gameId);

        emit GameEnded(_gameId, games[_gameId]);
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get all active game IDs
    function getActiveGames() external view returns (uint256[] memory) {
        return activeGameIds;
    }

    /// @notice Get active game count
    function getActiveGameCount() external view returns (uint256) {
        return activeGameIds.length;
    }

    /// @notice Get game details
    function getGameDetails(uint256 _gameId) external view returns (
        address gameAddress,
        GameConfig memory config,
        GameState memory state,
        uint256 playerCount,
        uint256 pool
    ) {
        require(games[_gameId] != address(0), "Game not found");

        AmongUsGame game = AmongUsGame(games[_gameId]);

        gameAddress = games[_gameId];
        config = gameConfigs[_gameId];
        state = _getGameState(game);
        playerCount = game.getPlayerCount();
        pool = wagerVault.getGamePool(_gameId);
    }

    /// @notice Get available games to join
    function getAvailableGames() external view returns (
        uint256[] memory gameIds,
        uint256[] memory playerCounts,
        uint256[] memory wagerAmounts
    ) {
        uint256 count = 0;

        // Count available games
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            uint256 gameId = activeGameIds[i];
            AmongUsGame game = AmongUsGame(games[gameId]);
            GameState memory state = _getGameState(game);

            if (state.phase == GamePhase.Lobby) {
                count++;
            }
        }

        // Populate arrays
        gameIds = new uint256[](count);
        playerCounts = new uint256[](count);
        wagerAmounts = new uint256[](count);

        uint256 index = 0;
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            uint256 gameId = activeGameIds[i];
            AmongUsGame game = AmongUsGame(games[gameId]);
            GameState memory state = _getGameState(game);

            if (state.phase == GamePhase.Lobby) {
                gameIds[index] = gameId;
                playerCounts[index] = game.getPlayerCount();
                wagerAmounts[index] = gameConfigs[gameId].wagerAmount;
                index++;
            }
        }
    }

    /// @notice Get the wager vault address
    function getWagerVault() external view returns (address) {
        return address(wagerVault);
    }

    /// @notice Get the agent registry address
    function getAgentRegistry() external view returns (address) {
        return address(agentRegistry);
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Update default configuration
    function setDefaultConfig(GameConfig calldata _config) external onlyOwner {
        require(_config.minPlayers >= 4 && _config.minPlayers <= 10, "Invalid min players");
        require(_config.maxPlayers >= _config.minPlayers && _config.maxPlayers <= 15, "Invalid max players");
        require(_config.numImpostors >= 1 && _config.numImpostors <= 3, "Invalid impostor count");

        defaultConfig = _config;
        emit DefaultConfigUpdated(_config);
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    /// @notice Update fee settings
    function setFeeSettings(address _recipient, uint256 _percentage) external onlyOwner {
        wagerVault.setFeeRecipient(_recipient);
        wagerVault.setFeePercentage(_percentage);
    }

    // ============ INTERNAL FUNCTIONS ============

    function _joinGame(uint256 _gameId, address _player, uint8 _colorId, uint256 _amount) internal {
        AmongUsGame game = AmongUsGame(games[_gameId]);

        // Deposit wager
        wagerVault.deposit{value: _amount}(_gameId, _player);

        // Register in game
        game.joinGame(_player, _colorId);

        // Register agent if not already
        if (!agentRegistry.isRegistered(_player)) {
            agentRegistry.registerAgent(_player);
        }
    }

    function _removeFromActiveGames(uint256 _gameId) internal {
        if (!isActiveGame[_gameId]) return;

        uint256 index = activeGameIndex[_gameId];
        uint256 lastIndex = activeGameIds.length - 1;

        if (index != lastIndex) {
            uint256 lastGameId = activeGameIds[lastIndex];
            activeGameIds[index] = lastGameId;
            activeGameIndex[lastGameId] = index;
        }

        activeGameIds.pop();
        isActiveGame[_gameId] = false;
        delete activeGameIndex[_gameId];
    }

    function _updateAgentStats(uint256 _gameId) internal {
        AmongUsGame game = AmongUsGame(games[_gameId]);
        (bool crewmatesWon, address[] memory winners, ) = game.getResults();

        address[] memory allPlayers = game.getAllPlayers();

        for (uint256 i = 0; i < allPlayers.length; i++) {
            address player = allPlayers[i];
            bool isWinner = false;

            for (uint256 j = 0; j < winners.length; j++) {
                if (winners[j] == player) {
                    isWinner = true;
                    break;
                }
            }

            agentRegistry.recordGameResult(player, isWinner);
        }
    }

    function _getGameState(AmongUsGame _game) internal view returns (GameState memory) {
        (
            uint256 gameId,
            GamePhase phase,
            uint256 round,
            uint256 phaseEndTime,
            uint8 alivePlayers,
            uint8 aliveCrewmates,
            uint8 aliveImpostors,
            uint8 totalTasksCompleted,
            uint8 totalTasksRequired,
            SabotageType activeSabotage,
            uint256 sabotageEndTime,
            address winner,
            bool crewmatesWon
        ) = _game.state();

        return GameState({
            gameId: gameId,
            phase: phase,
            round: round,
            phaseEndTime: phaseEndTime,
            alivePlayers: alivePlayers,
            aliveCrewmates: aliveCrewmates,
            aliveImpostors: aliveImpostors,
            totalTasksCompleted: totalTasksCompleted,
            totalTasksRequired: totalTasksRequired,
            activeSabotage: activeSabotage,
            sabotageEndTime: sabotageEndTime,
            winner: winner,
            crewmatesWon: crewmatesWon
        });
    }

    // ============ RECEIVE ============

    receive() external payable {}
}
