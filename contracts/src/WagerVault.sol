// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GameTypes.sol";
import "./AmongUsGame.sol";

/// @title WagerVault - Escrow and payout management for Among Us On-Chain
/// @notice Holds wagers during games and distributes winnings
contract WagerVault {
    // ============ STATE VARIABLES ============

    address public factory;
    address public feeRecipient;
    uint256 public feePercentage; // Basis points (100 = 1%)

    // Game deposits tracking
    mapping(uint256 => mapping(address => uint256)) public deposits; // gameId => player => amount
    mapping(uint256 => uint256) public gamePools; // gameId => total pool
    mapping(uint256 => bool) public gameSettled; // gameId => settled

    // Player statistics
    mapping(address => uint256) public totalWinnings;
    mapping(address => uint256) public totalWagered;
    mapping(address => uint256) public gamesPlayed;
    mapping(address => uint256) public gamesWon;

    // ============ EVENTS ============

    event Deposited(uint256 indexed gameId, address indexed player, uint256 amount);
    event Withdrawn(uint256 indexed gameId, address indexed player, uint256 amount);
    event WinningsDistributed(uint256 indexed gameId, address indexed winner, uint256 amount);
    event FeeCollected(uint256 indexed gameId, uint256 amount);
    event RefundIssued(uint256 indexed gameId, address indexed player, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _feeRecipient, uint256 _feePercentage) {
        factory = msg.sender;
        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage; // e.g., 500 = 5%
    }

    // ============ DEPOSIT FUNCTIONS ============

    /// @notice Deposit wager for a game
    /// @param _gameId The game ID
    /// @param _player The player depositing
    function deposit(uint256 _gameId, address _player) external payable onlyFactory {
        require(msg.value > 0, "No value sent");
        require(deposits[_gameId][_player] == 0, "Already deposited");

        deposits[_gameId][_player] = msg.value;
        gamePools[_gameId] += msg.value;
        totalWagered[_player] += msg.value;
        gamesPlayed[_player]++;

        emit Deposited(_gameId, _player, msg.value);
    }

    /// @notice Refund a player (before game starts)
    /// @param _gameId The game ID
    /// @param _player The player to refund
    function refund(uint256 _gameId, address _player) external onlyFactory {
        uint256 amount = deposits[_gameId][_player];
        require(amount > 0, "No deposit");

        deposits[_gameId][_player] = 0;
        gamePools[_gameId] -= amount;
        totalWagered[_player] -= amount;
        gamesPlayed[_player]--;

        (bool success, ) = _player.call{value: amount}("");
        require(success, "Refund failed");

        emit RefundIssued(_gameId, _player, amount);
    }

    // ============ SETTLEMENT FUNCTIONS ============

    /// @notice Settle a completed game and distribute winnings
    /// @param _gameId The game ID
    /// @param _game The game contract address
    function settleGame(uint256 _gameId, address _game) external onlyFactory {
        require(!gameSettled[_gameId], "Already settled");

        AmongUsGame game = AmongUsGame(_game);
        require(game.isGameEnded(), "Game not ended");

        gameSettled[_gameId] = true;

        (bool crewmatesWon, address[] memory winners, ) = game.getResults();

        uint256 pool = gamePools[_gameId];
        uint256 fee = (pool * feePercentage) / 10000;
        uint256 winningsPool = pool - fee;

        // Collect fee
        if (fee > 0 && feeRecipient != address(0)) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
            emit FeeCollected(_gameId, fee);
        }

        // Distribute to winners
        if (winners.length > 0) {
            uint256 sharePerWinner = winningsPool / winners.length;

            for (uint256 i = 0; i < winners.length; i++) {
                address winner = winners[i];

                totalWinnings[winner] += sharePerWinner;
                gamesWon[winner]++;

                (bool success, ) = winner.call{value: sharePerWinner}("");
                require(success, "Winner payout failed");

                emit WinningsDistributed(_gameId, winner, sharePerWinner);
            }

            // Handle remainder (dust)
            uint256 remainder = winningsPool - (sharePerWinner * winners.length);
            if (remainder > 0 && winners.length > 0) {
                (bool dustSuccess, ) = winners[0].call{value: remainder}("");
                require(dustSuccess, "Dust transfer failed");
            }
        }
    }

    /// @notice Emergency refund all players for a cancelled game
    /// @param _gameId The game ID
    /// @param _players Array of player addresses
    function emergencyRefund(uint256 _gameId, address[] calldata _players) external onlyFactory {
        require(!gameSettled[_gameId], "Already settled");
        gameSettled[_gameId] = true;

        for (uint256 i = 0; i < _players.length; i++) {
            address player = _players[i];
            uint256 amount = deposits[_gameId][player];

            if (amount > 0) {
                deposits[_gameId][player] = 0;
                (bool success, ) = player.call{value: amount}("");
                require(success, "Refund failed");
                emit RefundIssued(_gameId, player, amount);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get player's deposit for a game
    function getDeposit(uint256 _gameId, address _player) external view returns (uint256) {
        return deposits[_gameId][_player];
    }

    /// @notice Get total pool for a game
    function getGamePool(uint256 _gameId) external view returns (uint256) {
        return gamePools[_gameId];
    }

    /// @notice Get player statistics
    function getPlayerStats(address _player) external view returns (
        uint256 wagered,
        uint256 winnings,
        uint256 played,
        uint256 won
    ) {
        return (
            totalWagered[_player],
            totalWinnings[_player],
            gamesPlayed[_player],
            gamesWon[_player]
        );
    }

    /// @notice Check if game is settled
    function isSettled(uint256 _gameId) external view returns (bool) {
        return gameSettled[_gameId];
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Update fee recipient
    function setFeeRecipient(address _newRecipient) external onlyFactory {
        feeRecipient = _newRecipient;
    }

    /// @notice Update fee percentage (max 10%)
    function setFeePercentage(uint256 _newPercentage) external onlyFactory {
        require(_newPercentage <= 1000, "Fee too high"); // Max 10%
        feePercentage = _newPercentage;
    }

    // ============ RECEIVE ============

    receive() external payable {}
}
