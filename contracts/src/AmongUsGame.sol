// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GameTypes.sol";

/// @title AmongUsGame - Core game logic for Among Us On-Chain
/// @notice Manages a single game instance with commit-reveal mechanics
contract AmongUsGame is IGameEvents {
    // ============ STATE VARIABLES ============

    GameConfig public config;
    GameState public state;

    address public factory;
    address public wagerVault;

    // Player management
    mapping(address => Player) public players;
    address[] public playerAddresses;
    mapping(address => bool) public isPlayer;

    // Role assignments (private - only revealed at game end)
    mapping(address => Role) private roles;
    address[] private impostors;

    // Action commit-reveal
    mapping(uint256 => mapping(address => ActionCommitment)) public commitments; // round => player => commitment
    mapping(uint256 => mapping(address => RevealedAction)) public revealedActions; // round => player => action

    // Dead bodies
    DeadBody[] public deadBodies;
    mapping(Location => bool) public hasBodyAt;

    // Voting
    mapping(uint256 => mapping(address => Vote)) public votes; // round => voter => vote
    mapping(uint256 => mapping(address => uint256)) public voteCount; // round => suspect => count
    uint256 public currentVoteRound;

    // Discussion messages
    DiscussionMessage[] public messages;

    // Emergency meetings tracking
    mapping(address => uint8) public emergencyMeetingsUsed;

    // Kill cooldown tracking
    mapping(address => uint256) public lastKillRound;

    // Task assignments (simplified - each player has task IDs 0 to tasksPerPlayer-1)
    mapping(address => mapping(uint8 => bool)) public taskCompleted;

    // Adjacent rooms for movement
    mapping(Location => Location[]) internal adjacentRooms;

    // Vent connections for impostors
    mapping(Location => Location) internal ventConnections;

    // ============ MODIFIERS ============

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyPlayer() {
        require(isPlayer[msg.sender], "Not a player");
        _;
    }

    modifier onlyAlive() {
        require(players[msg.sender].isAlive, "Player is dead");
        _;
    }

    modifier inPhase(GamePhase phase) {
        require(state.phase == phase, "Wrong phase");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        uint256 _gameId,
        address _creator,
        address _wagerVault,
        GameConfig memory _config
    ) {
        factory = msg.sender;
        wagerVault = _wagerVault;
        config = _config;

        state.gameId = _gameId;
        state.phase = GamePhase.Lobby;
        state.round = 0;

        // Initialize map connections
        _initializeMap();

        emit GameCreated(_gameId, _creator, _config.wagerAmount);
    }

    // ============ PLAYER MANAGEMENT ============

    /// @notice Join the game (called by factory after wager deposit)
    function joinGame(address _player, uint8 _colorId) external onlyFactory {
        require(state.phase == GamePhase.Lobby, "Game already started");
        require(!isPlayer[_player], "Already joined");
        require(playerAddresses.length < config.maxPlayers, "Game full");

        players[_player] = Player({
            addr: _player,
            colorId: _colorId,
            role: Role.None,
            location: Location.Cafeteria,
            isAlive: true,
            tasksCompleted: 0,
            totalTasks: config.tasksPerPlayer,
            wagerAmount: config.wagerAmount,
            hasVoted: false,
            lastActionRound: 0
        });

        playerAddresses.push(_player);
        isPlayer[_player] = true;

        emit PlayerJoined(state.gameId, _player, _colorId);
    }

    /// @notice Leave game before it starts (direct call)
    function leaveGame() external onlyPlayer inPhase(GamePhase.Lobby) {
        _removePlayer(msg.sender);
        emit PlayerLeft(state.gameId, msg.sender);
    }

    /// @notice Leave game before it starts (called via factory)
    function leaveGameFor(address _player) external onlyFactory inPhase(GamePhase.Lobby) {
        require(isPlayer[_player], "Not a player");
        _removePlayer(_player);
        emit PlayerLeft(state.gameId, _player);
    }

    // ============ GAME FLOW ============

    /// @notice Start the game (requires minimum players)
    function startGame() external onlyPlayer inPhase(GamePhase.Lobby) {
        require(playerAddresses.length >= config.minPlayers, "Not enough players");

        state.phase = GamePhase.Starting;
        _assignRoles();
        _assignTasks();

        state.alivePlayers = uint8(playerAddresses.length);
        state.aliveCrewmates = state.alivePlayers - config.numImpostors;
        state.aliveImpostors = config.numImpostors;
        state.totalTasksRequired = state.aliveCrewmates * config.tasksPerPlayer;

        state.phase = GamePhase.ActionCommit;
        state.round = 1;
        state.phaseEndTime = block.timestamp + config.actionTimeout;

        emit GameStarted(state.gameId, block.timestamp);
        emit RolesAssigned(state.gameId);
    }

    // ============ ACTION COMMIT-REVEAL ============

    /// @notice Commit an action hash
    function commitAction(bytes32 _hash) external onlyPlayer onlyAlive inPhase(GamePhase.ActionCommit) {
        require(commitments[state.round][msg.sender].hash == bytes32(0), "Already committed");

        commitments[state.round][msg.sender] = ActionCommitment({
            hash: _hash,
            timestamp: block.timestamp,
            revealed: false
        });

        emit ActionCommitted(state.gameId, msg.sender, state.round);

        // Check if all alive players committed
        if (_allPlayersCommitted()) {
            _advanceToReveal();
        }
    }

    /// @notice Reveal a committed action
    function revealAction(
        ActionType _actionType,
        address _target,
        Location _destination,
        uint8 _taskId,
        SabotageType _sabotage,
        bytes32 _salt
    ) external onlyPlayer onlyAlive inPhase(GamePhase.ActionReveal) {
        ActionCommitment storage commitment = commitments[state.round][msg.sender];
        require(commitment.hash != bytes32(0), "No commitment");
        require(!commitment.revealed, "Already revealed");

        // Verify hash
        bytes32 computedHash = keccak256(abi.encodePacked(
            _actionType,
            _target,
            _destination,
            _taskId,
            _sabotage,
            _salt,
            msg.sender
        ));
        require(computedHash == commitment.hash, "Hash mismatch");

        commitment.revealed = true;

        revealedActions[state.round][msg.sender] = RevealedAction({
            actionType: _actionType,
            target: _target,
            destination: _destination,
            taskId: _taskId,
            sabotage: _sabotage
        });

        emit ActionRevealed(state.gameId, msg.sender, _actionType);

        // Check if all alive players revealed
        if (_allPlayersRevealed()) {
            _processActions();
        }
    }

    /// @notice Force advance phase if timeout reached
    function advancePhase() external {
        require(block.timestamp >= state.phaseEndTime, "Phase not ended");

        if (state.phase == GamePhase.ActionCommit) {
            _advanceToReveal();
        } else if (state.phase == GamePhase.ActionReveal) {
            _processActions();
        } else if (state.phase == GamePhase.Discussion) {
            _startVoting();
        } else if (state.phase == GamePhase.Voting) {
            _processVotes();
        }
    }

    // ============ VOTING ============

    /// @notice Submit a vote during voting phase
    function submitVote(address _suspect) external onlyPlayer onlyAlive inPhase(GamePhase.Voting) {
        require(!players[msg.sender].hasVoted, "Already voted");
        require(_suspect == address(0) || (isPlayer[_suspect] && players[_suspect].isAlive), "Invalid target");

        players[msg.sender].hasVoted = true;

        votes[currentVoteRound][msg.sender] = Vote({
            voter: msg.sender,
            suspect: _suspect,
            timestamp: block.timestamp
        });

        if (_suspect != address(0)) {
            voteCount[currentVoteRound][_suspect]++;
        }

        emit VoteCast(state.gameId, msg.sender);

        // Check if all alive players voted
        if (_allPlayersVoted()) {
            _processVotes();
        }
    }

    /// @notice Submit a discussion message
    function submitMessage(
        MessageType _msgType,
        address _target,
        AccuseReason _reason,
        Location _location
    ) external onlyPlayer onlyAlive inPhase(GamePhase.Discussion) {
        messages.push(DiscussionMessage({
            sender: msg.sender,
            msgType: _msgType,
            target: _target,
            reason: _reason,
            location: _location,
            timestamp: block.timestamp
        }));
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get player's own role (only visible to that player)
    function getMyRole() external view onlyPlayer returns (Role) {
        return roles[msg.sender];
    }

    /// @notice Get fellow impostors (only for impostors)
    function getImpostors() external view onlyPlayer returns (address[] memory) {
        require(roles[msg.sender] == Role.Impostor, "Not impostor");
        return impostors;
    }

    /// @notice Get all players at a location
    function getPlayersAtLocation(Location _location) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].location == _location && players[playerAddresses[i]].isAlive) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].location == _location && players[playerAddresses[i]].isAlive) {
                result[index] = playerAddresses[i];
                index++;
            }
        }
        return result;
    }

    /// @notice Get adjacent rooms for movement
    function getAdjacentRooms(Location _location) external view returns (Location[] memory) {
        return adjacentRooms[_location];
    }

    /// @notice Get all dead bodies
    function getDeadBodies() external view returns (DeadBody[] memory) {
        return deadBodies;
    }

    /// @notice Get all players
    function getAllPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }

    /// @notice Get player count
    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }

    /// @notice Get discussion messages
    function getMessages() external view returns (DiscussionMessage[] memory) {
        return messages;
    }

    /// @notice Check if game has ended
    function isGameEnded() external view returns (bool) {
        return state.phase == GamePhase.Ended;
    }

    /// @notice Get game results (only after game ends)
    function getResults() external view returns (
        bool crewmatesWon,
        address[] memory winners,
        uint256 prizePool
    ) {
        require(state.phase == GamePhase.Ended, "Game not ended");

        crewmatesWon = state.crewmatesWon;
        prizePool = playerAddresses.length * config.wagerAmount;

        // Count winners
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (crewmatesWon && roles[p] == Role.Crewmate) {
                winnerCount++;
            } else if (!crewmatesWon && roles[p] == Role.Impostor) {
                winnerCount++;
            }
        }

        winners = new address[](winnerCount);
        uint256 index = 0;
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (crewmatesWon && roles[p] == Role.Crewmate) {
                winners[index] = p;
                index++;
            } else if (!crewmatesWon && roles[p] == Role.Impostor) {
                winners[index] = p;
                index++;
            }
        }
    }

    // ============ INTERNAL FUNCTIONS ============

    function _initializeMap() internal {
        // Cafeteria connections
        adjacentRooms[Location.Cafeteria].push(Location.Admin);
        adjacentRooms[Location.Cafeteria].push(Location.MedBay);
        adjacentRooms[Location.Cafeteria].push(Location.UpperEngine);

        // Admin connections
        adjacentRooms[Location.Admin].push(Location.Cafeteria);
        adjacentRooms[Location.Admin].push(Location.Storage);

        // Storage connections
        adjacentRooms[Location.Storage].push(Location.Admin);
        adjacentRooms[Location.Storage].push(Location.Electrical);
        adjacentRooms[Location.Storage].push(Location.LowerEngine);

        // Electrical connections
        adjacentRooms[Location.Electrical].push(Location.Storage);
        adjacentRooms[Location.Electrical].push(Location.LowerEngine);

        // MedBay connections
        adjacentRooms[Location.MedBay].push(Location.Cafeteria);
        adjacentRooms[Location.MedBay].push(Location.UpperEngine);
        adjacentRooms[Location.MedBay].push(Location.Security);

        // UpperEngine connections
        adjacentRooms[Location.UpperEngine].push(Location.Cafeteria);
        adjacentRooms[Location.UpperEngine].push(Location.MedBay);
        adjacentRooms[Location.UpperEngine].push(Location.Reactor);

        // LowerEngine connections
        adjacentRooms[Location.LowerEngine].push(Location.Storage);
        adjacentRooms[Location.LowerEngine].push(Location.Electrical);
        adjacentRooms[Location.LowerEngine].push(Location.Security);

        // Security connections
        adjacentRooms[Location.Security].push(Location.MedBay);
        adjacentRooms[Location.Security].push(Location.LowerEngine);
        adjacentRooms[Location.Security].push(Location.Reactor);

        // Reactor connections
        adjacentRooms[Location.Reactor].push(Location.UpperEngine);
        adjacentRooms[Location.Reactor].push(Location.Security);

        // Vent connections
        ventConnections[Location.Reactor] = Location.Security;
        ventConnections[Location.Security] = Location.Reactor;
        ventConnections[Location.MedBay] = Location.Electrical;
        ventConnections[Location.Electrical] = Location.MedBay;
        ventConnections[Location.Cafeteria] = Location.Admin;
        ventConnections[Location.Admin] = Location.Cafeteria;
    }

    function _assignRoles() internal {
        // Simple pseudo-random selection for impostors
        // In production, use VRF for true randomness
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            playerAddresses.length
        )));

        uint8 impostorsAssigned = 0;
        uint256 playersRemaining = playerAddresses.length;

        for (uint256 i = 0; i < playerAddresses.length && impostorsAssigned < config.numImpostors; i++) {
            uint256 rand = uint256(keccak256(abi.encodePacked(seed, i))) % playersRemaining;

            // Probability-based assignment
            if (rand < (config.numImpostors - impostorsAssigned)) {
                roles[playerAddresses[i]] = Role.Impostor;
                impostors.push(playerAddresses[i]);
                impostorsAssigned++;
            } else {
                roles[playerAddresses[i]] = Role.Crewmate;
            }
            playersRemaining--;
        }

        // Assign remaining as crewmates
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (roles[playerAddresses[i]] == Role.None) {
                roles[playerAddresses[i]] = Role.Crewmate;
            }
        }
    }

    function _assignTasks() internal {
        // Tasks are simplified - each crewmate gets tasks 0 to tasksPerPlayer-1
        // In a full implementation, these would be specific task types
    }

    function _removePlayer(address _player) internal {
        isPlayer[_player] = false;

        // Remove from array
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (playerAddresses[i] == _player) {
                playerAddresses[i] = playerAddresses[playerAddresses.length - 1];
                playerAddresses.pop();
                break;
            }
        }

        delete players[_player];
    }

    function _allPlayersCommitted() internal view returns (bool) {
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (players[p].isAlive && commitments[state.round][p].hash == bytes32(0)) {
                return false;
            }
        }
        return true;
    }

    function _allPlayersRevealed() internal view returns (bool) {
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (players[p].isAlive && !commitments[state.round][p].revealed) {
                return false;
            }
        }
        return true;
    }

    function _allPlayersVoted() internal view returns (bool) {
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (players[p].isAlive && !players[p].hasVoted) {
                return false;
            }
        }
        return true;
    }

    function _advanceToReveal() internal {
        state.phase = GamePhase.ActionReveal;
        state.phaseEndTime = block.timestamp + config.actionTimeout;
    }

    function _processActions() internal {
        // Process all revealed actions in order: moves, tasks, kills, sabotage, reports

        // 1. Process movements first
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive) continue;

            RevealedAction storage action = revealedActions[state.round][p];

            if (action.actionType == ActionType.Move) {
                if (_isValidMove(p, action.destination)) {
                    players[p].location = action.destination;
                }
            } else if (action.actionType == ActionType.Vent) {
                if (roles[p] == Role.Impostor && _isValidVent(p, action.destination)) {
                    players[p].location = action.destination;
                }
            }
        }

        // 2. Process kills
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive || roles[p] != Role.Impostor) continue;

            RevealedAction storage action = revealedActions[state.round][p];

            if (action.actionType == ActionType.Kill) {
                if (_canKill(p, action.target)) {
                    _killPlayer(action.target, players[p].location);
                    lastKillRound[p] = state.round;
                }
            }
        }

        // 3. Process tasks
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive || roles[p] != Role.Crewmate) continue;

            RevealedAction storage action = revealedActions[state.round][p];

            if (action.actionType == ActionType.DoTask) {
                if (action.taskId < config.tasksPerPlayer && !taskCompleted[p][action.taskId]) {
                    taskCompleted[p][action.taskId] = true;
                    players[p].tasksCompleted++;
                    state.totalTasksCompleted++;
                    emit TaskCompleted(state.gameId, p, action.taskId);
                }
            }
        }

        // 4. Process sabotage
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive || roles[p] != Role.Impostor) continue;

            RevealedAction storage action = revealedActions[state.round][p];

            if (action.actionType == ActionType.Sabotage && state.activeSabotage == SabotageType.None) {
                state.activeSabotage = action.sabotage;
                if (action.sabotage == SabotageType.Reactor || action.sabotage == SabotageType.O2) {
                    state.sabotageEndTime = block.timestamp + 45; // 45 seconds to fix
                }
                emit SabotageStarted(state.gameId, action.sabotage);
            }
        }

        // 5. Check for reports/meetings
        bool meetingCalled = false;
        address meetingCaller;

        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive) continue;

            RevealedAction storage action = revealedActions[state.round][p];

            if (action.actionType == ActionType.Report) {
                // Check if there's a body at player's location
                if (hasBodyAt[players[p].location]) {
                    meetingCalled = true;
                    meetingCaller = p;
                    _markBodyReported(players[p].location);
                    emit BodyReported(state.gameId, p, address(0)); // TODO: track victim
                    break;
                }
            } else if (action.actionType == ActionType.CallMeeting) {
                if (emergencyMeetingsUsed[p] < config.emergencyMeetings &&
                    players[p].location == Location.Cafeteria) {
                    meetingCalled = true;
                    meetingCaller = p;
                    emergencyMeetingsUsed[p]++;
                    emit MeetingCalled(state.gameId, p);
                    break;
                }
            }
        }

        // 6. Check win conditions
        if (_checkWinConditions()) {
            return; // Game ended
        }

        // 7. Move to next phase
        if (meetingCalled) {
            _startDiscussion();
        } else {
            _startNextRound();
        }
    }

    function _startDiscussion() internal {
        state.phase = GamePhase.Discussion;
        state.phaseEndTime = block.timestamp + config.discussionTime;
        delete messages;
    }

    function _startVoting() internal {
        state.phase = GamePhase.Voting;
        state.phaseEndTime = block.timestamp + config.voteTimeout;
        currentVoteRound++;

        // Reset hasVoted for all alive players
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            players[playerAddresses[i]].hasVoted = false;
        }
    }

    function _processVotes() internal {
        // Find player with most votes
        address maxVoted = address(0);
        uint256 maxVotes = 0;
        bool tie = false;

        for (uint256 i = 0; i < playerAddresses.length; i++) {
            address p = playerAddresses[i];
            if (!players[p].isAlive) continue;

            uint256 votes_ = voteCount[currentVoteRound][p];
            if (votes_ > maxVotes) {
                maxVotes = votes_;
                maxVoted = p;
                tie = false;
            } else if (votes_ == maxVotes && votes_ > 0) {
                tie = true;
            }
        }

        // Need majority to eject
        uint256 threshold = state.alivePlayers / 2;

        if (!tie && maxVotes > threshold && maxVoted != address(0)) {
            bool wasImpostor = roles[maxVoted] == Role.Impostor;
            _ejectPlayer(maxVoted);
            emit PlayerEjected(state.gameId, maxVoted, wasImpostor);
        } else {
            emit NoOneEjected(state.gameId);
        }

        // Check win conditions after ejection
        if (_checkWinConditions()) {
            return;
        }

        _startNextRound();
    }

    function _startNextRound() internal {
        state.round++;
        state.phase = GamePhase.ActionCommit;
        state.phaseEndTime = block.timestamp + config.actionTimeout;
    }

    function _killPlayer(address _victim, Location _location) internal {
        players[_victim].isAlive = false;
        roles[_victim] = Role.Ghost;
        state.alivePlayers--;

        if (roles[_victim] == Role.Crewmate || roles[_victim] == Role.Ghost) {
            state.aliveCrewmates--;
        }

        deadBodies.push(DeadBody({
            victim: _victim,
            location: _location,
            round: state.round,
            reported: false
        }));
        hasBodyAt[_location] = true;

        emit PlayerKilled(state.gameId, _victim, _location);
    }

    function _ejectPlayer(address _player) internal {
        players[_player].isAlive = false;
        state.alivePlayers--;

        if (roles[_player] == Role.Impostor) {
            state.aliveImpostors--;
        } else {
            state.aliveCrewmates--;
        }

        roles[_player] = Role.Ghost;
    }

    function _markBodyReported(Location _location) internal {
        hasBodyAt[_location] = false;
        for (uint256 i = 0; i < deadBodies.length; i++) {
            if (deadBodies[i].location == _location && !deadBodies[i].reported) {
                deadBodies[i].reported = true;
            }
        }
    }

    function _isValidMove(address _player, Location _destination) internal view returns (bool) {
        Location current = players[_player].location;
        Location[] storage adjacent = adjacentRooms[current];

        for (uint256 i = 0; i < adjacent.length; i++) {
            if (adjacent[i] == _destination) {
                return true;
            }
        }
        return false;
    }

    function _isValidVent(address _player, Location _destination) internal view returns (bool) {
        Location current = players[_player].location;
        return ventConnections[current] == _destination;
    }

    function _canKill(address _killer, address _victim) internal view returns (bool) {
        if (!players[_victim].isAlive) return false;
        if (players[_killer].location != players[_victim].location) return false;
        if (state.round - lastKillRound[_killer] < config.killCooldown) return false;
        return true;
    }

    function _checkWinConditions() internal returns (bool) {
        // Crewmates win: all tasks completed OR all impostors ejected
        if (state.totalTasksCompleted >= state.totalTasksRequired) {
            _endGame(true);
            return true;
        }

        if (state.aliveImpostors == 0) {
            _endGame(true);
            return true;
        }

        // Impostors win: equal or more impostors than crewmates OR critical sabotage
        if (state.aliveImpostors >= state.aliveCrewmates) {
            _endGame(false);
            return true;
        }

        if (state.activeSabotage == SabotageType.Reactor || state.activeSabotage == SabotageType.O2) {
            if (block.timestamp >= state.sabotageEndTime) {
                _endGame(false);
                return true;
            }
        }

        return false;
    }

    function _endGame(bool _crewmatesWon) internal {
        state.phase = GamePhase.Ended;
        state.crewmatesWon = _crewmatesWon;

        uint256 prizePool = playerAddresses.length * config.wagerAmount;
        emit GameEnded(state.gameId, _crewmatesWon, prizePool);
    }
}
