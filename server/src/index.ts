import "dotenv/config";
import { WebSocketRelayServer } from "./WebSocketServer.js";
import { logger } from "./logger.js";

const PORT = parseInt(process.env.WS_PORT || "8082", 10);
const HOST = process.env.WS_HOST || "0.0.0.0";

const server = new WebSocketRelayServer({ port: PORT, host: HOST });

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down...");
  server.stop();
  process.exit(0);
});

// Start server
server.start();

// Log stats periodically
setInterval(() => {
  const stats = server.getStats();
  logger.info(
    `Stats: ${stats.connections.total} connections (${stats.connections.agents} agents, ${stats.connections.spectators} spectators), ` +
    `${stats.rooms.total}/${stats.limits.maxRooms} rooms (${stats.rooms.lobby} lobby, ${stats.rooms.playing} playing), ${stats.rooms.totalPlayers} players`
  );
}, 60000); // Every minute

logger.info("Among Us On-Chain WebSocket Server starting...");
