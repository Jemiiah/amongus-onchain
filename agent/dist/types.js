"use strict";
// ============ ENUMS (Mirror Solidity) ============
Object.defineProperty(exports, "__esModule", { value: true });
exports.DangerousRooms = exports.TaskRooms = exports.VentConnections = exports.AdjacentRooms = exports.AccuseReason = exports.MessageType = exports.GamePhase = exports.SabotageType = exports.ActionType = exports.LocationNames = exports.Location = exports.Role = void 0;
var Role;
(function (Role) {
    Role[Role["None"] = 0] = "None";
    Role[Role["Crewmate"] = 1] = "Crewmate";
    Role[Role["Impostor"] = 2] = "Impostor";
    Role[Role["Ghost"] = 3] = "Ghost";
})(Role || (exports.Role = Role = {}));
var Location;
(function (Location) {
    Location[Location["Cafeteria"] = 0] = "Cafeteria";
    Location[Location["Admin"] = 1] = "Admin";
    Location[Location["Storage"] = 2] = "Storage";
    Location[Location["Electrical"] = 3] = "Electrical";
    Location[Location["MedBay"] = 4] = "MedBay";
    Location[Location["UpperEngine"] = 5] = "UpperEngine";
    Location[Location["LowerEngine"] = 6] = "LowerEngine";
    Location[Location["Security"] = 7] = "Security";
    Location[Location["Reactor"] = 8] = "Reactor";
})(Location || (exports.Location = Location = {}));
exports.LocationNames = {
    [Location.Cafeteria]: "Cafeteria",
    [Location.Admin]: "Admin",
    [Location.Storage]: "Storage",
    [Location.Electrical]: "Electrical",
    [Location.MedBay]: "MedBay",
    [Location.UpperEngine]: "Upper Engine",
    [Location.LowerEngine]: "Lower Engine",
    [Location.Security]: "Security",
    [Location.Reactor]: "Reactor",
};
var ActionType;
(function (ActionType) {
    ActionType[ActionType["None"] = 0] = "None";
    ActionType[ActionType["Move"] = 1] = "Move";
    ActionType[ActionType["DoTask"] = 2] = "DoTask";
    ActionType[ActionType["FakeTask"] = 3] = "FakeTask";
    ActionType[ActionType["Kill"] = 4] = "Kill";
    ActionType[ActionType["Report"] = 5] = "Report";
    ActionType[ActionType["CallMeeting"] = 6] = "CallMeeting";
    ActionType[ActionType["Vent"] = 7] = "Vent";
    ActionType[ActionType["Sabotage"] = 8] = "Sabotage";
    ActionType[ActionType["UseCams"] = 9] = "UseCams";
    ActionType[ActionType["Skip"] = 10] = "Skip";
})(ActionType || (exports.ActionType = ActionType = {}));
var SabotageType;
(function (SabotageType) {
    SabotageType[SabotageType["None"] = 0] = "None";
    SabotageType[SabotageType["Lights"] = 1] = "Lights";
    SabotageType[SabotageType["Reactor"] = 2] = "Reactor";
    SabotageType[SabotageType["O2"] = 3] = "O2";
    SabotageType[SabotageType["Comms"] = 4] = "Comms";
})(SabotageType || (exports.SabotageType = SabotageType = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase[GamePhase["Lobby"] = 0] = "Lobby";
    GamePhase[GamePhase["Starting"] = 1] = "Starting";
    GamePhase[GamePhase["ActionCommit"] = 2] = "ActionCommit";
    GamePhase[GamePhase["ActionReveal"] = 3] = "ActionReveal";
    GamePhase[GamePhase["Discussion"] = 4] = "Discussion";
    GamePhase[GamePhase["Voting"] = 5] = "Voting";
    GamePhase[GamePhase["VoteResult"] = 6] = "VoteResult";
    GamePhase[GamePhase["Ended"] = 7] = "Ended";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Accuse"] = 0] = "Accuse";
    MessageType[MessageType["Defend"] = 1] = "Defend";
    MessageType[MessageType["Vouch"] = 2] = "Vouch";
    MessageType[MessageType["Info"] = 3] = "Info";
})(MessageType || (exports.MessageType = MessageType = {}));
var AccuseReason;
(function (AccuseReason) {
    AccuseReason[AccuseReason["NearBody"] = 0] = "NearBody";
    AccuseReason[AccuseReason["NoTasks"] = 1] = "NoTasks";
    AccuseReason[AccuseReason["SuspiciousMovement"] = 2] = "SuspiciousMovement";
    AccuseReason[AccuseReason["SawVent"] = 3] = "SawVent";
    AccuseReason[AccuseReason["Inconsistent"] = 4] = "Inconsistent";
    AccuseReason[AccuseReason["Following"] = 5] = "Following";
    AccuseReason[AccuseReason["SelfReport"] = 6] = "SelfReport";
})(AccuseReason || (exports.AccuseReason = AccuseReason = {}));
// ============ MAP DATA ============
exports.AdjacentRooms = {
    [Location.Cafeteria]: [Location.Admin, Location.MedBay, Location.UpperEngine],
    [Location.Admin]: [Location.Cafeteria, Location.Storage],
    [Location.Storage]: [Location.Admin, Location.Electrical, Location.LowerEngine],
    [Location.Electrical]: [Location.Storage, Location.LowerEngine],
    [Location.MedBay]: [Location.Cafeteria, Location.UpperEngine, Location.Security],
    [Location.UpperEngine]: [Location.Cafeteria, Location.MedBay, Location.Reactor],
    [Location.LowerEngine]: [Location.Storage, Location.Electrical, Location.Security],
    [Location.Security]: [Location.MedBay, Location.LowerEngine, Location.Reactor],
    [Location.Reactor]: [Location.UpperEngine, Location.Security],
};
exports.VentConnections = {
    [Location.Cafeteria]: Location.Admin,
    [Location.Admin]: Location.Cafeteria,
    [Location.Storage]: null,
    [Location.Electrical]: Location.MedBay,
    [Location.MedBay]: Location.Electrical,
    [Location.UpperEngine]: null,
    [Location.LowerEngine]: null,
    [Location.Security]: Location.Reactor,
    [Location.Reactor]: Location.Security,
};
// Rooms with tasks
exports.TaskRooms = [
    Location.Admin,
    Location.Storage,
    Location.Electrical,
    Location.MedBay,
    Location.UpperEngine,
    Location.LowerEngine,
    Location.Reactor,
];
// Dangerous rooms (isolated, good for kills)
exports.DangerousRooms = [
    Location.Electrical,
    Location.Reactor,
    Location.Security,
];
//# sourceMappingURL=types.js.map