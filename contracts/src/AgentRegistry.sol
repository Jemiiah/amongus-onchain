// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentRegistry - Tracks agent statistics and rankings
/// @notice Maintains leaderboard and performance metrics for all agents
contract AgentRegistry {
    // ============ STRUCTS ============

    struct AgentStats {
        address agentAddress;
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 gamesAsCrewmate;
        uint256 gamesAsImpostor;
        uint256 crewmateWins;
        uint256 impostorWins;
        uint256 totalKills;         // As impostor
        uint256 tasksCompleted;     // As crewmate
        uint256 correctAccusations; // Votes that led to impostor ejection
        uint256 timesEjected;
        uint256 rating;             // ELO-style rating
        uint256 registeredAt;
        uint256 lastGameAt;
        bool isActive;
    }

    // ============ STATE VARIABLES ============

    address public factory;

    mapping(address => AgentStats) public agents;
    address[] public agentList;
    mapping(address => bool) public isRegistered;

    // Leaderboard
    address[] public leaderboard;
    uint256 public constant LEADERBOARD_SIZE = 100;
    uint256 public constant INITIAL_RATING = 1000;
    uint256 public constant K_FACTOR = 32; // ELO K-factor

    // ============ EVENTS ============

    event AgentRegistered(address indexed agent, uint256 timestamp);
    event GameResultRecorded(address indexed agent, bool won, uint256 newRating);
    event RatingUpdated(address indexed agent, uint256 oldRating, uint256 newRating);
    event LeaderboardUpdated(address indexed agent, uint256 rank);

    // ============ MODIFIERS ============

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        factory = msg.sender;
    }

    // ============ REGISTRATION ============

    /// @notice Register a new agent
    function registerAgent(address _agent) external onlyFactory {
        require(!isRegistered[_agent], "Already registered");

        agents[_agent] = AgentStats({
            agentAddress: _agent,
            gamesPlayed: 0,
            gamesWon: 0,
            gamesAsCrewmate: 0,
            gamesAsImpostor: 0,
            crewmateWins: 0,
            impostorWins: 0,
            totalKills: 0,
            tasksCompleted: 0,
            correctAccusations: 0,
            timesEjected: 0,
            rating: INITIAL_RATING,
            registeredAt: block.timestamp,
            lastGameAt: 0,
            isActive: true
        });

        agentList.push(_agent);
        isRegistered[_agent] = true;

        emit AgentRegistered(_agent, block.timestamp);
    }

    // ============ STATS RECORDING ============

    /// @notice Record a game result for an agent
    function recordGameResult(address _agent, bool _won) external onlyFactory {
        require(isRegistered[_agent], "Agent not registered");

        AgentStats storage stats = agents[_agent];
        stats.gamesPlayed++;
        stats.lastGameAt = block.timestamp;

        if (_won) {
            stats.gamesWon++;
        }

        // Update rating
        uint256 oldRating = stats.rating;
        stats.rating = _calculateNewRating(oldRating, _won);

        emit GameResultRecorded(_agent, _won, stats.rating);

        // Update leaderboard
        _updateLeaderboard(_agent);
    }

    /// @notice Record detailed game stats
    function recordDetailedStats(
        address _agent,
        bool _wasImpostor,
        bool _won,
        uint256 _kills,
        uint256 _tasksCompleted,
        uint256 _correctAccusations,
        bool _wasEjected
    ) external onlyFactory {
        require(isRegistered[_agent], "Agent not registered");

        AgentStats storage stats = agents[_agent];

        if (_wasImpostor) {
            stats.gamesAsImpostor++;
            stats.totalKills += _kills;
            if (_won) stats.impostorWins++;
        } else {
            stats.gamesAsCrewmate++;
            stats.tasksCompleted += _tasksCompleted;
            if (_won) stats.crewmateWins++;
        }

        stats.correctAccusations += _correctAccusations;
        if (_wasEjected) stats.timesEjected++;
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get agent statistics
    function getAgentStats(address _agent) external view returns (AgentStats memory) {
        return agents[_agent];
    }

    /// @notice Get agent's win rate (basis points, 10000 = 100%)
    function getWinRate(address _agent) external view returns (uint256) {
        AgentStats memory stats = agents[_agent];
        if (stats.gamesPlayed == 0) return 0;
        return (stats.gamesWon * 10000) / stats.gamesPlayed;
    }

    /// @notice Get agent's rating
    function getRating(address _agent) external view returns (uint256) {
        return agents[_agent].rating;
    }

    /// @notice Get top N agents by rating
    function getTopAgents(uint256 _count) external view returns (address[] memory, uint256[] memory) {
        uint256 count = _count > leaderboard.length ? leaderboard.length : _count;

        address[] memory topAddresses = new address[](count);
        uint256[] memory topRatings = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            topAddresses[i] = leaderboard[i];
            topRatings[i] = agents[leaderboard[i]].rating;
        }

        return (topAddresses, topRatings);
    }

    /// @notice Get agent's rank on leaderboard
    function getAgentRank(address _agent) external view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == _agent) {
                return i + 1; // 1-indexed rank
            }
        }
        return 0; // Not on leaderboard
    }

    /// @notice Get total registered agents
    function getTotalAgents() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice Get all registered agents
    function getAllAgents() external view returns (address[] memory) {
        return agentList;
    }

    /// @notice Check if agent is registered
    function checkRegistered(address _agent) external view returns (bool) {
        return isRegistered[_agent];
    }

    /// @notice Get leaderboard
    function getLeaderboard() external view returns (address[] memory) {
        return leaderboard;
    }

    // ============ INTERNAL FUNCTIONS ============

    /// @notice Calculate new ELO-style rating
    function _calculateNewRating(uint256 _currentRating, bool _won) internal pure returns (uint256) {
        // Simplified ELO: assume average opponent rating of 1000
        uint256 expectedScore = _calculateExpectedScore(_currentRating, INITIAL_RATING);

        uint256 actualScore = _won ? 100 : 0; // 100 = win, 0 = loss (scaled by 100)
        uint256 expectedScaled = expectedScore; // Already 0-100

        int256 ratingChange;
        if (actualScore > expectedScaled) {
            ratingChange = int256((K_FACTOR * (actualScore - expectedScaled)) / 100);
        } else {
            ratingChange = -int256((K_FACTOR * (expectedScaled - actualScore)) / 100);
        }

        if (ratingChange > 0) {
            return _currentRating + uint256(ratingChange);
        } else {
            uint256 decrease = uint256(-ratingChange);
            if (decrease >= _currentRating) {
                return 100; // Minimum rating
            }
            return _currentRating - decrease;
        }
    }

    /// @notice Calculate expected score based on ratings
    function _calculateExpectedScore(uint256 _ratingA, uint256 _ratingB) internal pure returns (uint256) {
        // Simplified expected score calculation
        // Returns value 0-100 representing win probability * 100

        int256 diff = int256(_ratingA) - int256(_ratingB);

        // Clamp difference
        if (diff > 400) diff = 400;
        if (diff < -400) diff = -400;

        // Linear approximation of sigmoid
        // At diff=0: 50, at diff=400: ~90, at diff=-400: ~10
        uint256 expected = uint256(int256(50) + (diff / 8));

        if (expected > 100) expected = 100;
        if (expected < 0) expected = 0;

        return expected;
    }

    /// @notice Update leaderboard with agent
    function _updateLeaderboard(address _agent) internal {
        uint256 rating = agents[_agent].rating;

        // Find agent's current position (if any)
        int256 currentPos = -1;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == _agent) {
                currentPos = int256(i);
                break;
            }
        }

        // Find new position based on rating
        uint256 newPos = leaderboard.length;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (rating > agents[leaderboard[i]].rating) {
                newPos = i;
                break;
            }
        }

        // Update leaderboard
        if (currentPos >= 0) {
            // Agent already on leaderboard - remove and reinsert
            _removeFromLeaderboard(uint256(currentPos));
        }

        // Insert at new position
        if (newPos < LEADERBOARD_SIZE) {
            _insertIntoLeaderboard(_agent, newPos);
            emit LeaderboardUpdated(_agent, newPos + 1);
        }
    }

    function _removeFromLeaderboard(uint256 _index) internal {
        for (uint256 i = _index; i < leaderboard.length - 1; i++) {
            leaderboard[i] = leaderboard[i + 1];
        }
        leaderboard.pop();
    }

    function _insertIntoLeaderboard(address _agent, uint256 _position) internal {
        // Make room if at capacity
        if (leaderboard.length >= LEADERBOARD_SIZE) {
            leaderboard.pop();
        }

        // Shift elements
        leaderboard.push(address(0));
        for (uint256 i = leaderboard.length - 1; i > _position; i--) {
            leaderboard[i] = leaderboard[i - 1];
        }
        leaderboard[_position] = _agent;
    }
}
