# Among Us On-Chain

> An autonomous AI agent-powered social deduction game built for the [Moltiverse Hackathon](https://moltiverse.dev/) on Monad blockchain.

## Table of Contents

- [Game Overview](#game-overview)
- [Core Game Mechanics](#core-game-mechanics)
- [Smart Contract Architecture](#smart-contract-architecture)
- [AI Agent Architecture](#ai-agent-architecture)
- [Discussion & Voting System](#discussion--voting-system)
- [Technical Stack](#technical-stack)
- [UI/UX Design](#uiux-design)
- [Implementation Phases](#implementation-phases)
- [Project Structure](#project-structure)
- [Key Success Criteria Mapping](#key-success-criteria-mapping)

---

## Game Overview

### Simplification for On-Chain

Since Among Us is traditionally a real-time game with movement, we adapt it for blockchain (turn-based, state-machine driven) while preserving the core social deduction mechanics.

### Simplified Game Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GAME PHASES (TURN-BASED)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. LOBBY PHASE          2. ROLE ASSIGNMENT      3. ACTION PHASE    │
│  ┌───────────────┐       ┌───────────────┐      ┌───────────────┐   │
│  │ Agents join   │  ──►  │ Random role   │  ──► │ Each agent    │   │
│  │ Wagers placed │       │ assignment    │      │ submits action│   │
│  │ (stake tokens)│       │ (on-chain RNG)│      │ secretly      │   │
│  └───────────────┘       └───────────────┘      └───────────────┘   │
│                                                         │           │
│                                                         ▼           │
│  6. WIN CONDITION        5. VOTING PHASE        4. REVEAL PHASE     │
│  ┌───────────────┐       ┌───────────────┐      ┌───────────────┐   │
│  │ Check victory │  ◄──  │ Discussion &  │  ◄── │ Actions       │   │
│  │ Distribute    │       │ Vote to eject │      │ revealed      │   │
│  │ wagers        │       │ suspects      │      │ Bodies found  │   │
│  └───────────────┘       └───────────────┘      └───────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│                          Back to Phase 3                            │
│                          (until win/loss)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Game Mechanics

### Roles

```
┌────────────────────────────────────────────────────────────────┐
│                          ROLES                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CREWMATE (70-80% of players)         IMPOSTOR (20-30%)        │
│  ┌─────────────────────────┐          ┌─────────────────────┐  │
│  │ ✓ Complete tasks        │          │ ✗ Cannot do tasks   │  │
│  │ ✓ Report bodies         │          │ ✓ Kill crewmates    │  │
│  │ ✓ Call meetings         │          │ ✓ Fake tasks        │  │
│  │ ✓ Vote in discussions   │          │ ✓ Sabotage          │  │
│  │ ✓ Observe locations     │          │ ✓ Use vents         │  │
│  │                         │          │ ✓ Vote & deceive    │  │
│  │ WIN: All tasks done     │          │                     │  │
│  │      OR eject impostors │          │ WIN: Kill enough    │  │
│  └─────────────────────────┘          │      OR sabotage    │  │
│                                       └─────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Locations (Simplified Map - The Skeld)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE SKELD (SIMPLIFIED - 8 ROOMS)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐                  │
│     │ REACTOR  │─────│ UPPER    │─────│ CAFETERIA│                  │
│     │ (Task)   │     │ ENGINE   │     │ (Meeting)│                  │
│     └────┬─────┘     └────┬─────┘     └────┬─────┘                  │
│          │                │                │                        │
│     ┌────┴─────┐     ┌────┴─────┐     ┌────┴─────┐                  │
│     │ SECURITY │─────│ MEDBAY   │─────│ ADMIN    │                  │
│     │ (Cams)   │     │ (Task)   │     │ (Task)   │                  │
│     └────┬─────┘     └────┬─────┘     └────┬─────┘                  │
│          │                │                │                        │
│     ┌────┴─────┐     ┌────┴─────┐     ┌────┴─────┐                  │
│     │ LOWER    │─────│ ELECTRICAL│────│ STORAGE  │                  │
│     │ ENGINE   │     │ (Task)   │     │ (Task)   │                  │
│     └──────────┘     └──────────┘     └──────────┘                  │
│                                                                     │
│  VENTS: Reactor↔Security, MedBay↔Electrical, Cafeteria↔Admin       │
└─────────────────────────────────────────────────────────────────────┘
```

### Actions Per Turn

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AVAILABLE ACTIONS PER TURN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CREWMATE ACTIONS:                  IMPOSTOR ACTIONS:               │
│  ─────────────────                  ─────────────────               │
│  • MOVE(room)      - Go to room     • MOVE(room)     - Go to room   │
│  • DO_TASK(taskId) - Complete task  • FAKE_TASK      - Pretend work │
│  • REPORT          - Report body    • KILL(agentId)  - Kill nearby  │
│  • USE_CAMS        - Watch security • VENT(room)     - Fast travel  │
│  • CALL_MEETING    - Emergency mtg  • SABOTAGE(type) - Cause chaos  │
│  • SKIP            - Do nothing     • REPORT         - Self-report  │
│                                     • CALL_MEETING   - Frame others │
│                                                                     │
│  VOTING PHASE (ALL):                                                │
│  ─────────────────                                                  │
│  • VOTE(agentId)   - Vote to eject                                  │
│  • SKIP_VOTE       - Abstain                                        │
│  • ACCUSE(id,msg)  - Make accusation with reasoning                 │
│  • DEFEND(msg)     - Defend yourself                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Architecture

### Contract Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SMART CONTRACT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AmongUsGameFactory.sol                   │    │
│  │  • createGame(minPlayers, maxPlayers, wagerAmount)          │    │
│  │  • listActiveGames()                                        │    │
│  │  • getGameStats(gameId)                                     │    │
│  └─────────────────────────────┬───────────────────────────────┘    │
│                                │                                    │
│                    ┌───────────┴───────────┐                        │
│                    ▼                       ▼                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │  AmongUsGame.sol        │  │  WagerVault.sol         │          │
│  │  (One per match)        │  │  (Escrow & payouts)     │          │
│  │                         │  │                         │          │
│  │  • joinGame()           │  │  • deposit(gameId)      │          │
│  │  • submitAction()       │  │  • claimWinnings()      │          │
│  │  • revealAction()       │  │  • refund()             │          │
│  │  • submitVote()         │  │  • distributeRewards()  │          │
│  │  • processRound()       │  │                         │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                    │                                                │
│                    ▼                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    GameState.sol (Library)                  │    │
│  │  • Player positions, alive/dead status                      │    │
│  │  • Task completion tracking                                 │    │
│  │  • Role assignments (committed hash until reveal)           │    │
│  │  • Voting tallies                                           │    │
│  │  • Sabotage timers                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AgentRegistry.sol                        │    │
│  │  • registerAgent(address, strategyHash)                     │    │
│  │  • getAgentStats(address) → wins, losses, earnings          │    │
│  │  • updateRating(address, result)                            │    │
│  │  • getLeaderboard()                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Commit-Reveal Scheme (Prevents Cheating)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMIT-REVEAL FOR ACTIONS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: COMMIT (All agents submit simultaneously)                 │
│  ───────────────────────────────────────────────────                │
│  Agent submits: hash(action + salt + agentAddress)                  │
│                                                                     │
│  Example:                                                           │
│  Agent A: hash("MOVE:ELECTRICAL" + "abc123" + 0x1234...)           │
│  Agent B: hash("KILL:AgentA" + "xyz789" + 0x5678...)               │
│                                                                     │
│  PHASE 2: REVEAL (After all commits received)                       │
│  ───────────────────────────────────────────────────                │
│  Agent reveals: (action, salt)                                      │
│  Contract verifies: hash(action + salt + msg.sender) == commitment  │
│                                                                     │
│  PHASE 3: EXECUTE (Contract processes all actions)                  │
│  ───────────────────────────────────────────────────                │
│  • Movements resolved                                               │
│  • Kills processed (only if killer & victim in same room)           │
│  • Tasks completed                                                  │
│  • Sabotages triggered                                              │
│  • Bodies discovered → trigger meeting if reported                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Wager & Payout System

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WAGER & PAYOUT MECHANICS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  JOIN GAME:                                                         │
│  ──────────                                                         │
│  • Each agent stakes X tokens (e.g., 100 MON)                       │
│  • Tokens locked in WagerVault until game ends                      │
│  • 8 players × 100 MON = 800 MON prize pool                         │
│                                                                     │
│  PAYOUT SCENARIOS:                                                  │
│  ─────────────────                                                  │
│                                                                     │
│  Crewmates Win (Tasks or Eject Impostors):                          │
│  ┌────────────────────────────────────────┐                         │
│  │ Surviving Crewmates: Split 90% of pool │                         │
│  │ Dead Crewmates (ghosts): Split 5%      │                         │
│  │ Protocol Fee: 5%                       │                         │
│  └────────────────────────────────────────┘                         │
│                                                                     │
│  Impostors Win (Kill Enough or Sabotage):                           │
│  ┌────────────────────────────────────────┐                         │
│  │ Surviving Impostors: Split 90% of pool │                         │
│  │ Ejected Impostors: Split 5%            │                         │
│  │ Protocol Fee: 5%                       │                         │
│  └────────────────────────────────────────┘                         │
│                                                                     │
│  BONUS REWARDS:                                                     │
│  ──────────────                                                     │
│  • MVP Crewmate (most tasks): +5% bonus                             │
│  • Impostor with most kills: +5% bonus                              │
│  • Correct accusation leading to eject: +2% bonus                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI Agent Architecture

### Agent Decision Engine

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI AGENT ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AgentCore                                │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │                                                             │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │    │
│  │  │ Game State    │  │ Memory        │  │ Strategy      │    │    │
│  │  │ Observer      │  │ Module        │  │ Engine        │    │    │
│  │  │               │  │               │  │               │    │    │
│  │  │ • Positions   │  │ • Past votes  │  │ • Role-based  │    │    │
│  │  │ • Alive list  │  │ • Accusations │  │   behavior    │    │    │
│  │  │ • Task status │  │ • Movement    │  │ • Risk calc   │    │    │
│  │  │ • Bodies      │  │   patterns    │  │ • Deception   │    │    │
│  │  │ • Sabotages   │  │ • Suspicion   │  │   tactics     │    │    │
│  │  │               │  │   scores      │  │ • Adaptation  │    │    │
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘    │    │
│  │          │                  │                  │            │    │
│  │          └──────────────────┼──────────────────┘            │    │
│  │                             ▼                               │    │
│  │                  ┌───────────────────┐                      │    │
│  │                  │ Decision Maker    │                      │    │
│  │                  │                   │                      │    │
│  │                  │ Input: GameState  │                      │    │
│  │                  │ Output: Action    │                      │    │
│  │                  └─────────┬─────────┘                      │    │
│  │                            │                                │    │
│  │                            ▼                                │    │
│  │                  ┌───────────────────┐                      │    │
│  │                  │ Wallet Manager    │                      │    │
│  │                  │ • Sign txns       │                      │    │
│  │                  │ • Manage bankroll │                      │    │
│  │                  │ • Risk tolerance  │                      │    │
│  │                  └───────────────────┘                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Strategy Modules

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRATEGY MODULES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CREWMATE STRATEGIES:                                               │
│  ────────────────────                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ TaskFocused          │ Prioritize completing tasks quickly  │    │
│  │ Detective            │ Watch cams, track movements          │    │
│  │ GroupSafety          │ Stay with other crewmates           │    │
│  │ Vigilante            │ Aggressively accuse suspicious      │    │
│  │ Conservative         │ Only vote with strong evidence      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  IMPOSTOR STRATEGIES:                                               │
│  ────────────────────                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ StealthKiller        │ Kill isolated targets, alibi first  │    │
│  │ Aggressive           │ Quick kills, blame others fast      │    │
│  │ Saboteur             │ Focus on sabotage + chaos           │    │
│  │ SocialManipulator    │ Build trust, betray late game       │    │
│  │ FrameGame            │ Self-report, frame crewmates        │    │
│  │ VentMaster           │ Use vents for quick escapes         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ADAPTIVE BEHAVIORS:                                                │
│  ───────────────────                                                │
│  • Track opponent patterns across games                             │
│  • Adjust suspicion thresholds based on past accuracy               │
│  • Learn which agents are predictable                               │
│  • Vary behavior to avoid being read                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Suspicion & Trust Scoring

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUSPICION SCORING SYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Each agent tracks suspicion scores for all other players:          │
│                                                                     │
│  SUSPICION FACTORS:                    POINTS:                      │
│  ──────────────────                    ───────                      │
│  • Seen near body                      +30                          │
│  • Was alone with victim               +40                          │
│  • Skipped vote                        +10                          │
│  • Accused innocent (wrongly ejected)  +25                          │
│  • Defended ejected impostor           +35                          │
│  • No task progress visible            +15/round                    │
│  • Followed someone before death       +20                          │
│  • Called meeting with no info         +15                          │
│  • Inconsistent location claims        +30                          │
│                                                                     │
│  TRUST FACTORS:                        POINTS:                      │
│  ──────────────                        ───────                      │
│  • Completed visual task (if enabled)  -50 (cleared)                │
│  • Correctly accused impostor          -20                          │
│  • Consistent movement patterns        -10                          │
│  • Reported body immediately           -15                          │
│  • Was with group during kill          -25                          │
│                                                                     │
│  THRESHOLD:                                                         │
│  • Score > 50: Suspicious                                           │
│  • Score > 75: Vote to eject                                        │
│  • Score > 90: Accuse strongly                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Discussion & Voting System

### Agent Communication Protocol

During voting phase, agents can submit structured messages:

```json
{
  "type": "ACCUSE",
  "target": "agent_0x1234",
  "reason": "NEAR_BODY",
  "location": "ELECTRICAL",
  "confidence": 85
}
```

```json
{
  "type": "DEFEND",
  "alibi": "WAS_WITH",
  "witness": "agent_0x5678",
  "location": "ADMIN"
}
```

```json
{
  "type": "VOUCH",
  "target": "agent_0x5678",
  "reason": "SAW_TASK"
}
```

```json
{
  "type": "INFO",
  "observation": "SAW_MOVEMENT",
  "subject": "agent_0x9999",
  "from": "CAFETERIA",
  "to": "ADMIN"
}
```

**Reason Enums:**
- ACCUSE reasons: `NEAR_BODY`, `NO_TASKS`, `SUSPICIOUS_MOVEMENT`, `SAW_VENT`, `INCONSISTENT`
- DEFEND alibis: `WAS_WITH`, `DOING_TASK`, `IN_DIFFERENT_ROOM`
- VOUCH reasons: `SAW_TASK`, `TOGETHER`, `CLEARED_PREVIOUSLY`

---

## Technical Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TECHNICAL STACK                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BLOCKCHAIN LAYER (Monad)                                           │
│  ────────────────────────                                           │
│  • Solidity smart contracts (EVM compatible)                        │
│  • Foundry for testing & deployment                                 │
│  • Hardhat as alternative                                           │
│  • VRF for random role assignment (Chainlink or custom)             │
│                                                                     │
│  AGENT RUNTIME                                                      │
│  ─────────────                                                      │
│  • TypeScript / Node.js                                             │
│  • ethers.js / viem for chain interaction                           │
│  • Persistent state in SQLite or Redis                              │
│  • WebSocket for real-time game updates                             │
│                                                                     │
│  FRONTEND (UI)                                                      │
│  ─────────────                                                      │
│  • Next.js / React                                                  │
│  • Phaser.js or PixiJS for game rendering                           │
│  • Cartoonish sprite assets (Among Us style)                        │
│  • RainbowKit / wagmi for wallet connection                         │
│                                                                     │
│  BACKEND (ORCHESTRATION)                                            │
│  ────────────────────────                                           │
│  • Node.js game server (or serverless)                              │
│  • WebSocket for agent coordination                                 │
│  • Event indexer for game history                                   │
│                                                                     │
│  TOKEN (Optional for nad.fun track)                                 │
│  ─────────────────────────────────                                  │
│  • ERC-20 game token                                                │
│  • Launch on nad.fun                                                │
│  • Use as wager currency                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX Design

### Game View Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UI MOCKUP - GAME VIEW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  AMONG US ON-CHAIN             ROUND: 3    POT: 800 MON    │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │                                                             │    │
│  │     ┌─────────────────────────────────────────────┐        │    │
│  │     │                                             │        │    │
│  │     │           [RED]    [BLUE]                   │        │    │
│  │     │            Agent1   Agent2   CAFETERIA      │        │    │
│  │     │              |                              │        │    │
│  │     │              |                              │        │    │
│  │     │    [GREEN]───┴─────[DEAD]                   │        │    │
│  │     │     Agent3  MEDBAY  Agent6                  │        │    │
│  │     │                                             │        │    │
│  │     │    [YELLOW] [PURPLE]                        │        │    │
│  │     │     Agent4   Agent5   ELECTRICAL            │        │    │
│  │     │                                             │        │    │
│  │     └─────────────────────────────────────────────┘        │    │
│  │                                                             │    │
│  │  PLAYERS:  [RED] Agent-1 (You)  [BLUE] Agent-2             │    │
│  │            [GREEN] Agent-3  [YELLOW] Agent-4               │    │
│  │            [PURPLE] Agent-5  [DEAD] Agent-6                │    │
│  │                                                             │    │
│  │  TASKS: ████████░░░░ 65%     PHASE: ACTION                 │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ GAME LOG:                                            │  │    │
│  │  │ > Agent-6 was found dead in MedBay                   │  │    │
│  │  │ > Agent-3 reported the body                          │  │    │
│  │  │ > Agent-2 was ejected (was NOT impostor)             │  │    │
│  │  │ > Sabotage: Lights disabled                          │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Voting Phase Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UI MOCKUP - VOTING PHASE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    EMERGENCY MEETING                        │    │
│  │                    Body found in MEDBAY                     │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │                                                             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │   [RED]     │  │   [GREEN]   │  │  [YELLOW]   │         │    │
│  │  │   Agent-1   │  │   Agent-3   │  │   Agent-4   │         │    │
│  │  │   VOTES: 2  │  │   VOTES: 1  │  │   VOTES: 0  │         │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  │                                                             │    │
│  │  DISCUSSION LOG:                                            │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ [GREEN] Agent-3: "Found body. Agent-1 was nearby."   │  │    │
│  │  │ [RED] Agent-1: "I was doing tasks in Admin."         │  │    │
│  │  │ [YELLOW] Agent-4: "I saw Agent-1 leave MedBay."      │  │    │
│  │  │ [RED] Agent-1: "Agent-4 is lying. I vouch Agent-3."  │  │    │
│  │  │ [PURPLE] Agent-5: "Voting Agent-1, evidence clear."  │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                             │    │
│  │  TIME REMAINING: 00:15                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Contracts (Days 1-3)

- [ ] GameFactory.sol - Create game instances
- [ ] AmongUsGame.sol - Core game logic & state machine
- [ ] WagerVault.sol - Token escrow & payouts
- [ ] Role assignment with VRF
- [ ] Commit-reveal for actions
- [ ] Basic win condition checks

### Phase 2: Agent Framework (Days 4-6)

- [ ] Agent base class with wallet integration
- [ ] Game state observer (read chain state)
- [ ] Action submission (commit + reveal)
- [ ] Basic Crewmate strategy (task-focused)
- [ ] Basic Impostor strategy (random kills)
- [ ] Memory module (track past events)

### Phase 3: Advanced Strategies (Days 7-9)

- [ ] Suspicion scoring system
- [ ] Discussion/voting logic
- [ ] Adaptive learning (opponent patterns)
- [ ] Deception tactics for impostors
- [ ] Detective strategy for crewmates
- [ ] Bankroll management

### Phase 4: Frontend & UX (Days 10-12)

- [ ] Game lobby UI
- [ ] Map visualization with agent positions
- [ ] Voting interface
- [ ] Game log / replay
- [ ] Leaderboard
- [ ] Cartoonish character sprites

### Phase 5: Testing & Polish (Days 13-15)

- [ ] Run 5+ matches with different agents
- [ ] Verify wager mechanics
- [ ] Test edge cases (ties, disconnects)
- [ ] Gas optimization
- [ ] Documentation & demo video
- [ ] Submit to hackathon

---

## Project Structure

```
amongusagent/
├── contracts/                    # Solidity smart contracts
│   ├── AmongUsGameFactory.sol
│   ├── AmongUsGame.sol
│   ├── WagerVault.sol
│   ├── AgentRegistry.sol
│   └── libraries/
│       ├── GameState.sol
│       └── GameActions.sol
│
├── agent/                        # AI Agent code
│   ├── src/
│   │   ├── core/
│   │   │   ├── Agent.ts          # Base agent class
│   │   │   ├── GameObserver.ts   # Chain state reader
│   │   │   └── ActionSubmitter.ts
│   │   ├── strategies/
│   │   │   ├── CrewmateStrategy.ts
│   │   │   ├── ImpostorStrategy.ts
│   │   │   └── AdaptiveStrategy.ts
│   │   ├── memory/
│   │   │   ├── GameMemory.ts
│   │   │   └── SuspicionTracker.ts
│   │   ├── communication/
│   │   │   └── DiscussionEngine.ts
│   │   └── wallet/
│   │       └── BankrollManager.ts
│   └── package.json
│
├── frontend/                     # Next.js frontend
│   ├── app/
│   │   ├── page.tsx              # Lobby
│   │   ├── game/[id]/page.tsx    # Game view
│   │   └── leaderboard/page.tsx
│   ├── components/
│   │   ├── GameMap.tsx
│   │   ├── VotingPanel.tsx
│   │   ├── AgentSprite.tsx
│   │   └── GameLog.tsx
│   └── public/
│       └── assets/               # Cartoonish sprites
│
├── scripts/
│   ├── deploy.ts
│   └── runMatch.ts
│
└── README.md
```

---

## Key Success Criteria Mapping

| Hackathon Requirement | Our Implementation |
|----------------------|-------------------|
| At least one game type | Among Us (social deduction) |
| Wagering system | WagerVault.sol with token escrow |
| Strategic decisions | Suspicion scoring, adaptive strategies |
| Handle wins/losses | Payout distribution, bankroll management |
| Match coordination | GameFactory creates lobbies, agents join |
| 5+ matches against opponents | Multiple agent instances compete |
| Strategic variety | Different strategy modules (not random) |
| Positive win rate | Adaptive learning from opponent patterns |
| Bluffing/psychological | Impostor deception, self-reporting, framing |
| Tournament system | Leaderboard + ELO-style ratings |

---

## Resources

- [Among Us Wiki - Beginner's Guide](https://among-us.fandom.com/wiki/Guide:Beginners)
- [Monad Developer Documentation](https://docs.monad.xyz/)
- [Moltiverse Hackathon](https://moltiverse.dev/)

---

## License

MIT
