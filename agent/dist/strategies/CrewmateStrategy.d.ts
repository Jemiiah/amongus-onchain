import type { Address } from "viem";
import { Action, DiscussionMessage } from "../types.js";
import { BaseStrategy, StrategyContext } from "./BaseStrategy.js";
export type CrewmateStyle = "task-focused" | "detective" | "group-safety" | "vigilante" | "conservative";
export declare class CrewmateStrategy extends BaseStrategy {
    private style;
    private nextTaskId;
    private emergencyMeetingsUsed;
    private maxEmergencyMeetings;
    constructor(style?: CrewmateStyle);
    decideAction(context: StrategyContext): Promise<Action>;
    private taskFocusedAction;
    private detectiveAction;
    private groupSafetyAction;
    private vigilanteAction;
    private conservativeAction;
    decideVote(context: StrategyContext): Promise<Address | null>;
    generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;
}
//# sourceMappingURL=CrewmateStrategy.d.ts.map