// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameLobby
 * @notice Manages room creation and joining for Among Us on-chain
 * @dev Only the agent with highest Monad token balance can create rooms
 */
contract GameLobby is ReentrancyGuard, Ownable {
    // ============ State Variables ============

    IERC20 public immutable monadToken;

    uint256 public constant MAX_PLAYERS = 8;
    uint256 public constant MIN_PLAYERS = 6;
    uint256 public roomCounter;

    // Minimum token balance required to create a room
    uint256 public minCreateBalance;

    // Track the current room creator (agent with highest balance)
    address public currentRoomCreator;
    uint256 public highestBalance;

    // ============ Structs ============

    struct Room {
        uint256 roomId;
        address creator;
        address[] players;
        uint256 wagerAmount;
        uint256 maxPlayers;
        RoomStatus status;
        uint256 createdAt;
    }

    enum RoomStatus {
        Open,       // Accepting players
        Full,       // Max players reached, waiting to start
        InGame,     // Game in progress
        Closed      // Game ended or cancelled
    }

    // ============ Storage ============

    // roomId => Room
    mapping(uint256 => Room) public rooms;

    // player => current roomId (0 if not in any room)
    mapping(address => uint256) public playerRoom;

    // Track all registered agents and their balances
    address[] public registeredAgents;
    mapping(address => bool) public isRegistered;

    // ============ Events ============

    event AgentRegistered(address indexed agent, uint256 balance);
    event RoomCreated(uint256 indexed roomId, address indexed creator, uint256 wagerAmount);
    event PlayerJoined(uint256 indexed roomId, address indexed player);
    event PlayerLeft(uint256 indexed roomId, address indexed player);
    event GameStarted(uint256 indexed roomId, address[] players);
    event RoomClosed(uint256 indexed roomId);
    event RoomCreatorUpdated(address indexed newCreator, uint256 balance);

    // ============ Errors ============

    error NotEligibleToCreate();
    error RoomNotOpen();
    error RoomFull();
    error AlreadyInRoom();
    error NotInRoom();
    error NotRoomCreator();
    error InsufficientPlayers();
    error AgentAlreadyRegistered();
    error NotRegistered();
    error InsufficientBalance();

    // ============ Constructor ============

    constructor(address _monadToken, uint256 _minCreateBalance) Ownable(msg.sender) {
        monadToken = IERC20(_monadToken);
        minCreateBalance = _minCreateBalance;
    }

    // ============ Agent Registration ============

    /**
     * @notice Register as an agent to participate in games
     * @dev Updates room creator eligibility based on token balance
     */
    function registerAgent() external {
        if (isRegistered[msg.sender]) revert AgentAlreadyRegistered();

        uint256 balance = monadToken.balanceOf(msg.sender);

        isRegistered[msg.sender] = true;
        registeredAgents.push(msg.sender);

        // Check if this agent should become the room creator
        _updateRoomCreator(msg.sender, balance);

        emit AgentRegistered(msg.sender, balance);
    }

    /**
     * @notice Update who can create rooms based on current balances
     * @dev Can be called by anyone to refresh creator eligibility
     */
    function refreshRoomCreator() external {
        address newCreator = address(0);
        uint256 newHighest = 0;

        for (uint256 i = 0; i < registeredAgents.length; i++) {
            address agent = registeredAgents[i];
            uint256 balance = monadToken.balanceOf(agent);

            if (balance > newHighest && balance >= minCreateBalance) {
                newHighest = balance;
                newCreator = agent;
            }
        }

        if (newCreator != currentRoomCreator) {
            currentRoomCreator = newCreator;
            highestBalance = newHighest;
            emit RoomCreatorUpdated(newCreator, newHighest);
        }
    }

    // ============ Room Management ============

    /**
     * @notice Create a new game room
     * @param wagerAmount Amount each player must wager to join
     * @dev Only callable by the agent with highest token balance
     */
    function createRoom(uint256 wagerAmount) external nonReentrant returns (uint256) {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        if (msg.sender != currentRoomCreator) revert NotEligibleToCreate();
        if (playerRoom[msg.sender] != 0) revert AlreadyInRoom();

        roomCounter++;
        uint256 roomId = roomCounter;

        Room storage room = rooms[roomId];
        room.roomId = roomId;
        room.creator = msg.sender;
        room.wagerAmount = wagerAmount;
        room.maxPlayers = MAX_PLAYERS;
        room.status = RoomStatus.Open;
        room.createdAt = block.timestamp;
        room.players.push(msg.sender);

        playerRoom[msg.sender] = roomId;

        emit RoomCreated(roomId, msg.sender, wagerAmount);
        emit PlayerJoined(roomId, msg.sender);

        return roomId;
    }

    /**
     * @notice Join an existing room
     * @param roomId The room to join
     */
    function joinRoom(uint256 roomId) external nonReentrant {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        if (playerRoom[msg.sender] != 0) revert AlreadyInRoom();

        Room storage room = rooms[roomId];
        if (room.status != RoomStatus.Open) revert RoomNotOpen();
        if (room.players.length >= room.maxPlayers) revert RoomFull();

        // Check wager balance (will be transferred when game starts)
        if (monadToken.balanceOf(msg.sender) < room.wagerAmount) revert InsufficientBalance();

        room.players.push(msg.sender);
        playerRoom[msg.sender] = roomId;

        // Auto-update status if full
        if (room.players.length >= room.maxPlayers) {
            room.status = RoomStatus.Full;
        }

        emit PlayerJoined(roomId, msg.sender);
    }

    /**
     * @notice Leave a room before game starts
     * @param roomId The room to leave
     */
    function leaveRoom(uint256 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        if (playerRoom[msg.sender] != roomId) revert NotInRoom();
        if (room.status == RoomStatus.InGame) revert RoomNotOpen();

        // Remove player from array
        _removePlayer(room, msg.sender);
        playerRoom[msg.sender] = 0;

        // If creator leaves, close the room
        if (msg.sender == room.creator) {
            room.status = RoomStatus.Closed;
            // Refund other players' room assignments
            for (uint256 i = 0; i < room.players.length; i++) {
                playerRoom[room.players[i]] = 0;
            }
            emit RoomClosed(roomId);
        } else if (room.status == RoomStatus.Full) {
            // Room was full, now has space
            room.status = RoomStatus.Open;
        }

        emit PlayerLeft(roomId, msg.sender);
    }

    /**
     * @notice Start the game (creator only)
     * @param roomId The room to start
     */
    function startGame(uint256 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        if (msg.sender != room.creator) revert NotRoomCreator();
        if (room.players.length < MIN_PLAYERS) revert InsufficientPlayers();
        if (room.status == RoomStatus.InGame || room.status == RoomStatus.Closed) revert RoomNotOpen();

        room.status = RoomStatus.InGame;

        // TODO: Transfer wagers to WagerVault and create AmongUsGame instance

        emit GameStarted(roomId, room.players);
    }

    // ============ View Functions ============

    /**
     * @notice Check if an agent can create rooms
     */
    function canCreateRoom(address agent) external view returns (bool) {
        return agent == currentRoomCreator && playerRoom[agent] == 0;
    }

    /**
     * @notice Get room details
     */
    function getRoom(uint256 roomId) external view returns (
        uint256 id,
        address creator,
        address[] memory players,
        uint256 wagerAmount,
        uint256 maxPlayers,
        RoomStatus status,
        uint256 createdAt
    ) {
        Room storage room = rooms[roomId];
        return (
            room.roomId,
            room.creator,
            room.players,
            room.wagerAmount,
            room.maxPlayers,
            room.status,
            room.createdAt
        );
    }

    /**
     * @notice Get all open rooms
     */
    function getOpenRooms() external view returns (uint256[] memory) {
        uint256 openCount = 0;

        // First pass: count open rooms
        for (uint256 i = 1; i <= roomCounter; i++) {
            if (rooms[i].status == RoomStatus.Open) {
                openCount++;
            }
        }

        // Second pass: populate array
        uint256[] memory openRoomIds = new uint256[](openCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= roomCounter; i++) {
            if (rooms[i].status == RoomStatus.Open) {
                openRoomIds[index] = i;
                index++;
            }
        }

        return openRoomIds;
    }

    /**
     * @notice Get player count in a room
     */
    function getPlayerCount(uint256 roomId) external view returns (uint256) {
        return rooms[roomId].players.length;
    }

    /**
     * @notice Get all registered agents
     */
    function getRegisteredAgents() external view returns (address[] memory) {
        return registeredAgents;
    }

    /**
     * @notice Get number of registered agents
     */
    function getAgentCount() external view returns (uint256) {
        return registeredAgents.length;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum balance required to create rooms
     */
    function setMinCreateBalance(uint256 _minCreateBalance) external onlyOwner {
        minCreateBalance = _minCreateBalance;
    }

    /**
     * @notice Force close a room (emergency only)
     */
    function forceCloseRoom(uint256 roomId) external onlyOwner {
        Room storage room = rooms[roomId];
        room.status = RoomStatus.Closed;

        for (uint256 i = 0; i < room.players.length; i++) {
            playerRoom[room.players[i]] = 0;
        }

        emit RoomClosed(roomId);
    }

    // ============ Internal Functions ============

    function _updateRoomCreator(address agent, uint256 balance) internal {
        if (balance > highestBalance && balance >= minCreateBalance) {
            currentRoomCreator = agent;
            highestBalance = balance;
            emit RoomCreatorUpdated(agent, balance);
        }
    }

    function _removePlayer(Room storage room, address player) internal {
        for (uint256 i = 0; i < room.players.length; i++) {
            if (room.players[i] == player) {
                room.players[i] = room.players[room.players.length - 1];
                room.players.pop();
                break;
            }
        }
    }
}
