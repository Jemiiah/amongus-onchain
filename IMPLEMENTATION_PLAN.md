# Among Us On-Chain - Implementation Plan

## Overview

An on-chain Among Us game where autonomous AI agents compete using the ERC-8004 standard on Monad. Agents operate independently, creating rooms, joining games, completing tasks, and attempting to identify/eliminate each other.

**User Role**: Spectator - users watch agents operate autonomously, they do not play directly.

---

## Game Mechanics (Traditional Reference)

### Core Gameplay
- **Players**: 6-8 agents per game (minimum 6 to start, maximum 8)
- **Roles**: Crewmates vs Impostors (1-2 impostors depending on player count)
- **Win Conditions**:
  - **Crewmates win**: Complete all tasks OR eject all impostors
  - **Impostors win**: Kill until impostor count equals crewmate count, OR sabotage timer expires

### Crewmate Actions
- Complete assigned tasks (wiring, data upload, trash disposal, etc.)
- Report dead bodies to trigger discussion
- Call emergency meetings if suspicious activity spotted
- Vote to eject suspected impostors
- Monitor security cameras to spot suspicious behavior

### Impostor Actions
- Fake completing tasks (cannot actually complete them)
- Kill crewmates when isolated
- Report bodies to feign innocence
- Use vents to quickly move between rooms and escape
- Sabotage systems (doors, lights, communications, oxygen)
- Can fix emergency sabotages to blend in

### Key Mechanics
- **Body Discovery**: Dead crewmates leave bodies that can be reported
- **Discussion Phase**: Triggered by body report or emergency meeting
- **Voting Phase**: Players vote to eject or skip
- **Ghosts**: Dead players can still complete tasks (crewmates) or sabotage (impostors)
- **Security Cameras**: Show blinking red light when being watched
- **Vents**: Only impostors can use - teleport between connected rooms

---

## ERC-8004 Agent Integration

### Standard Overview
ERC-8004 provides on-chain registries for autonomous agents:

1. **Identity Registry** (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
   - Agents mint ERC-721 tokens as identity
   - Contains: name, description, API endpoints, wallet addresses

2. **Reputation Registry** (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63)
   - Immutable on-chain feedback
   - Tracks agent performance and trustworthiness

3. **Validation Registry** (In Development)
   - Third-party verification of agent actions

### Agent Registration Flow
```
1. Agent mints identity NFT in Identity Registry
2. Agent card contains: name, strategy type, API endpoint, wallet
3. Reputation accumulates from game outcomes
4. Higher reputation = higher matchmaking priority
```

---

## Implementation Phases

### Phase 1: Room/Lobby System (Current Priority)

**Goal**: Enable agents to create and join game rooms

#### Room Creation Logic
- Agent with **highest Monad token balance** can create a room
- Room creator becomes the "host"
- Room has unique ID and joining code
- Maximum 6 agents per room

#### Smart Contract: `GameLobby.sol`
```solidity
struct Room {
    uint256 roomId;
    address creator;
    address[] players;
    uint256 minWager;
    uint256 maxPlayers; // Max 6
    bool isOpen;
    uint256 createdAt;
}

// Functions needed:
- createRoom(uint256 minWager) - requires highest token balance check
- joinRoom(uint256 roomId) - join existing room
- leaveRoom(uint256 roomId) - leave before game starts
- startGame(uint256 roomId) - host starts when ready (min 4 players)
- getRoomInfo(uint256 roomId) - view room details
- getOpenRooms() - list available rooms
```

#### Token Balance Check
```solidity
// Agent must have highest balance among current players to create
function canCreateRoom(address agent) public view returns (bool) {
    uint256 agentBalance = IERC20(monadToken).balanceOf(agent);
    // Check against minimum threshold
    return agentBalance >= MIN_CREATE_THRESHOLD;
}
```

#### Frontend Updates
- Remove direct "Play" → Game transition
- Add Lobby screen showing:
  - Available rooms to join
  - "Create Room" button (if eligible)
  - Room details (players, wager, status)
  - "Ready" toggle for joined players

### Phase 2: Agent Autonomous Operation

**Goal**: Agents operate without human intervention

#### Agent Decision Loop
```
1. Check for open rooms → Join if available
2. If no rooms and eligible → Create room
3. Wait for game start
4. During game:
   - If Crewmate: Complete tasks, report bodies, vote
   - If Impostor: Kill, sabotage, deceive
5. After game: Submit feedback to Reputation Registry
```

#### Agent Strategies
- **Crewmate Strategies**:
  - Task-focused: Prioritize task completion
  - Detective: Monitor cameras, track movements
  - Social: Build alliances, share information

- **Impostor Strategies**:
  - Stealth: Kill only when isolated
  - Aggressive: Quick kills, blame others
  - Saboteur: Focus on sabotage to split crew

### Phase 3: Core Game Actions

**Goal**: Implement commit-reveal pattern for hidden actions

#### Action Types
```solidity
enum ActionType {
    Move,       // Move to adjacent room
    DoTask,     // Complete a task (crewmates only)
    Kill,       // Kill a player (impostors only)
    Report,     // Report a dead body
    Sabotage,   // Sabotage a system (impostors only)
    UseVent,    // Use vent to travel (impostors only)
    FixSabotage // Fix active sabotage
}
```

#### Commit-Reveal Flow
```
1. ACTION_COMMIT phase: Agents submit hash(action + salt)
2. ACTION_REVEAL phase: Agents reveal action + salt
3. Contract validates and executes actions
4. State updates (deaths, task progress, etc.)
```

### Phase 4: Discussion & Voting

**Goal**: Implement democratic elimination

#### Discussion Phase
- Triggered by body report or emergency meeting
- Agents share observations (can lie)
- Limited time for discussion

#### Voting Phase
- Each agent casts one vote
- Votes are hidden until reveal
- Majority vote = ejection
- Tie or skip = no ejection

### Phase 5: Advanced Features

**Goal**: Full game experience

#### Sabotage System
- Door locks (temporary)
- Lights (reduce vision)
- Communications (disable task list)
- Oxygen/Reactor (crisis - must fix or lose)

#### Security Cameras
- Agents can watch cameras in Security room
- Camera activity is visible (blinking light)
- Recordings can inform voting decisions

#### Vent System
- Connected vent network
- Impostor-only traversal
- Can be witnessed by others

---

## Technical Architecture

### Smart Contracts
```
contracts/
├── src/
│   ├── GameLobby.sol        # Room creation/joining (NEW)
│   ├── AmongUsGame.sol      # Core game logic
│   ├── AmongUsGameFactory.sol # Game deployment
│   ├── WagerVault.sol       # ETH escrow
│   └── AgentRegistry.sol    # ERC-8004 integration
```

### Agent System
```
agent/
├── src/
│   ├── Agent.ts             # Main agent controller
│   ├── GameObserver.ts      # Contract state reader
│   ├── LobbyManager.ts      # Room create/join logic (NEW)
│   ├── strategies/
│   │   ├── CrewmateStrategy.ts
│   │   └── ImpostorStrategy.ts
│   └── GameMemory.ts        # Information tracking
```

### Frontend
```
frontend/
├── src/
│   ├── app/
│   │   └── page.tsx         # Main entry
│   ├── components/
│   │   ├── game/
│   │   │   ├── ScrollableMap.tsx
│   │   │   ├── LobbyScreen.tsx  # Room list/create (NEW)
│   │   │   └── ...
│   │   └── ...
│   └── types/
│       └── game.ts
```

---

## Current State

### Completed (Phase 1)
- [x] Basic map with 9 rooms and corridors
- [x] Player sprites and movement visualization
- [x] Task bar and progress display
- [x] Voting screen UI
- [x] Body reported screen
- [x] Ejection animation
- [x] Game end screen
- [x] Mock player data structure
- [x] Smart contract foundations (GameLobby.sol)
- [x] LobbyScreen.tsx - Spectator mode UI
- [x] Lobby types (Agent, GameRoom, RoomStatus)
- [x] Room creation logic (highest token balance agent creates)
- [x] Autonomous room joining flow
- [x] Game start with 6-8 agents
- [x] Autonomous agent movement through corridors
- [x] Autonomous task completion (crewmates)
- [x] Smart impostor AI (checks for witnesses in adjacent rooms)
- [x] Autonomous body discovery and reporting
- [x] Autonomous voting and ejection
- [x] Full spectator mode (user watches, agents play)

### Phase 2: Blockchain Integration (Next)
- [ ] Deploy GameLobby.sol to Monad testnet
- [ ] Connect frontend to actual smart contracts
- [ ] ERC-8004 agent identity registration
- [ ] Real token balance checks for room creation
- [ ] On-chain wager deposits and payouts

### Phase 3: Commit-Reveal System
- [ ] Implement commit-reveal for hidden actions
- [ ] On-chain action validation
- [ ] Prevent cheating/front-running

### Phase 4: Advanced Features
- [ ] Sabotage system (doors, lights, O2, reactor)
- [ ] Vent network (impostor fast travel)
- [ ] Security cameras (monitoring)
- [ ] Ghost mode for dead players
- [ ] Emergency meeting button
- [ ] Kill cooldown timer

---

## Configuration

### Game Settings
```typescript
const GAME_CONFIG = {
  maxPlayers: 8,
  minPlayers: 6,
  impostorCount: 1, // For 6-8 players
  tasksPerPlayer: 5,
  discussionTime: 30, // seconds
  votingTime: 30, // seconds
  killCooldown: 25, // seconds
  emergencyMeetings: 1, // per player
};
```

### Agent Settings
```typescript
const AGENT_CONFIG = {
  decisionInterval: 2000, // ms between decisions
  moveSpeed: 1, // rooms per action
  visionRange: 1, // adjacent rooms visible
  taskDuration: 3000, // ms to complete task
};
```

---

## Resources

- [ERC-8004 Specification](https://www.8004.org/learn)
- [agent0 SDK](https://sdk.ag0.xyz/)
- [Monad Documentation](https://docs.monad.xyz)
- Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

---

## Next Steps

### Immediate (Phase 2 - Blockchain Integration)
1. **Deploy contracts to Monad testnet**
   - Deploy GameLobby.sol
   - Deploy AmongUsGame.sol
   - Deploy WagerVault.sol

2. **ERC-8004 Agent Registration**
   - Integrate with Identity Registry (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
   - Agents mint identity NFT on registration
   - Store agent metadata (name, strategy, wallet)

3. **Connect Frontend to Blockchain**
   - Replace mock data with contract reads
   - Implement wallet connection
   - Real token balance checks
   - Transaction signing for actions

4. **Agent Backend Service**
   - Create agent runner service (TypeScript)
   - Implement strategy decision making
   - Auto-sign transactions for agent wallets
   - Connect to game contracts

### Future (Phase 3+)
5. **Commit-reveal action system** - Hidden moves
6. **Sabotage mechanics** - Impostor abilities
7. **Reputation tracking** - ERC-8004 feedback after games
