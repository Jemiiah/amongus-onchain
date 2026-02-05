// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GameTypes - Enums and structs for Among Us On-Chain
/// @notice Defines all data types used across the game contracts

// ============ ENUMS ============

/// @notice Possible roles a player can have
enum Role {
    None,       // Not assigned yet
    Crewmate,   // Must complete tasks or find impostor
    Impostor,   // Must eliminate crewmates
    Ghost       // Dead player (can still observe)
}

/// @notice Locations on the map (simplified Skeld)
enum Location {
    Cafeteria,    // Starting point, emergency meetings
    Admin,        // Task location
    Storage,      // Task location
    Electrical,   // Task location (dangerous - isolated)
    MedBay,       // Task location
    UpperEngine,  // Task location
    LowerEngine,  // Task location
    Security,     // Camera room
    Reactor       // Task location
}

/// @notice Types of actions a player can take
enum ActionType {
    None,
    Move,           // Move to adjacent room
    DoTask,         // Complete a task (crewmate only)
    FakeTask,       // Pretend to do task (impostor)
    Kill,           // Kill a player (impostor only)
    Report,         // Report a dead body
    CallMeeting,    // Call emergency meeting
    Vent,           // Use vent to travel (impostor only)
    Sabotage,       // Trigger sabotage (impostor only)
    UseCams,        // Watch security cameras
    Skip            // Do nothing this turn
}

/// @notice Types of sabotage an impostor can trigger
enum SabotageType {
    None,
    Lights,     // Reduce crewmate vision
    Reactor,    // Critical - must be fixed or crew loses
    O2,         // Critical - must be fixed or crew loses
    Comms       // Disable task list visibility
}

/// @notice Current phase of the game
enum GamePhase {
    Lobby,          // Waiting for players
    Starting,       // Game about to start
    ActionCommit,   // Players submitting action commitments
    ActionReveal,   // Players revealing their actions
    Discussion,     // Body found or meeting called
    Voting,         // Players voting to eject
    VoteResult,     // Showing vote results
    Ended           // Game over
}

/// @notice Message types for discussion phase
enum MessageType {
    Accuse,     // Accuse someone
    Defend,     // Defend yourself
    Vouch,      // Vouch for someone
    Info        // Share information
}

/// @notice Reasons for accusations
enum AccuseReason {
    NearBody,           // Was seen near a dead body
    NoTasks,            // Hasn't been doing tasks
    SuspiciousMovement, // Moving erratically
    SawVent,            // Was seen venting
    Inconsistent,       // Story doesn't match
    Following,          // Was following victim
    SelfReport          // Suspected of self-reporting
}

// ============ STRUCTS ============

/// @notice Represents a player in the game
struct Player {
    address addr;           // Player's wallet address
    uint8 colorId;          // Visual identifier (0-11)
    Role role;              // Current role
    Location location;      // Current location on map
    bool isAlive;           // Whether player is alive
    uint8 tasksCompleted;   // Number of tasks done
    uint8 totalTasks;       // Total tasks assigned
    uint256 wagerAmount;    // Amount wagered
    bool hasVoted;          // Whether voted this round
    uint256 lastActionRound; // Last round player took action
}

/// @notice Represents a dead body on the map
struct DeadBody {
    address victim;         // Who was killed
    Location location;      // Where the body is
    uint256 round;          // When they were killed
    bool reported;          // Whether body was found
}

/// @notice Committed action (hash only, revealed later)
struct ActionCommitment {
    bytes32 hash;           // keccak256(action + salt + sender)
    uint256 timestamp;      // When committed
    bool revealed;          // Whether revealed yet
}

/// @notice Revealed action details
struct RevealedAction {
    ActionType actionType;
    address target;         // Target player (for kill/vote)
    Location destination;   // Destination (for move/vent)
    uint8 taskId;           // Task ID (for DoTask)
    SabotageType sabotage;  // Sabotage type (for Sabotage)
}

/// @notice Discussion message during voting phase
struct DiscussionMessage {
    address sender;
    MessageType msgType;
    address target;         // Who message is about
    AccuseReason reason;    // Reason (if accusing)
    Location location;      // Relevant location
    uint256 timestamp;
}

/// @notice Vote cast during voting phase
struct Vote {
    address voter;
    address suspect;        // Who they're voting for (address(0) = skip)
    uint256 timestamp;
}

/// @notice Game configuration
struct GameConfig {
    uint8 minPlayers;           // Minimum players to start (4-10)
    uint8 maxPlayers;           // Maximum players (4-15)
    uint8 numImpostors;         // Number of impostors (1-3)
    uint256 wagerAmount;        // Required wager in tokens
    uint256 actionTimeout;      // Seconds to submit action
    uint256 voteTimeout;        // Seconds for voting phase
    uint256 discussionTime;     // Seconds for discussion
    uint8 tasksPerPlayer;       // Tasks each crewmate must complete
    bool visualTasks;           // Whether tasks are visible to others
    uint8 emergencyMeetings;    // Emergency meetings per player
    uint256 killCooldown;       // Rounds between kills
}

/// @notice Overall game state
struct GameState {
    uint256 gameId;
    GamePhase phase;
    uint256 round;              // Current round number
    uint256 phaseEndTime;       // When current phase ends
    uint8 alivePlayers;         // Number of living players
    uint8 aliveCrewmates;       // Living crewmates
    uint8 aliveImpostors;       // Living impostors
    uint8 totalTasksCompleted;  // Tasks done by all crewmates
    uint8 totalTasksRequired;   // Total tasks needed to win
    SabotageType activeSabotage;// Current active sabotage
    uint256 sabotageEndTime;    // When sabotage kills crew (if not fixed)
    address winner;             // Winning team representative (or address(0))
    bool crewmatesWon;          // True if crewmates won
}

// ============ EVENTS INTERFACE ============

/// @notice Interface containing all game events
interface IGameEvents {
    event GameCreated(uint256 indexed gameId, address creator, uint256 wagerAmount);
    event PlayerJoined(uint256 indexed gameId, address player, uint8 colorId);
    event PlayerLeft(uint256 indexed gameId, address player);
    event GameStarted(uint256 indexed gameId, uint256 timestamp);
    event RolesAssigned(uint256 indexed gameId);
    event ActionCommitted(uint256 indexed gameId, address player, uint256 round);
    event ActionRevealed(uint256 indexed gameId, address player, ActionType actionType);
    event PlayerKilled(uint256 indexed gameId, address victim, Location location);
    event BodyReported(uint256 indexed gameId, address reporter, address victim);
    event MeetingCalled(uint256 indexed gameId, address caller);
    event VoteCast(uint256 indexed gameId, address voter);
    event PlayerEjected(uint256 indexed gameId, address player, bool wasImpostor);
    event NoOneEjected(uint256 indexed gameId);
    event TaskCompleted(uint256 indexed gameId, address player, uint8 taskId);
    event SabotageStarted(uint256 indexed gameId, SabotageType sabotageType);
    event SabotageFixed(uint256 indexed gameId, SabotageType sabotageType);
    event GameEnded(uint256 indexed gameId, bool crewmatesWon, uint256 prizePool);
    event WagerDeposited(uint256 indexed gameId, address player, uint256 amount);
    event WinningsDistributed(uint256 indexed gameId, address player, uint256 amount);
}
