import type { Address } from "viem";
import { Action, DiscussionMessage } from "../types.js";
import { BaseStrategy, StrategyContext } from "./BaseStrategy.js";
export type ImpostorStyle = "stealth" | "aggressive" | "saboteur" | "social-manipulator" | "frame-game";
export declare class ImpostorStrategy extends BaseStrategy {
    private style;
    private lastKillRound;
    private killCooldown;
    private framesTarget;
    private builtTrustWith;
    private fakingTaskAt;
    constructor(style?: ImpostorStyle);
    decideAction(context: StrategyContext): Promise<Action>;
    private canKill;
    private findKillTarget;
    private stealthAction;
    private aggressiveAction;
    private saboteurAction;
    private socialManipulatorAction;
    private frameGameAction;
    decideVote(context: StrategyContext): Promise<Address | null>;
    generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;
}
//# sourceMappingURL=ImpostorStrategy.d.ts.map