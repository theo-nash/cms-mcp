import { connectToDatabase } from "./config/db.js";
import { setupMcpServer } from "./mcp/server.js";
import { setupApiServer } from "./api/server.js";
import { SchedulerService } from "./services/scheduler.service.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get configuration from environment
const schedulerInterval = parseInt(
  process.env.SCHEDULER_INTERVAL || "60000",
  10
);
const apiPort = parseInt(process.env.API_PORT || "3000", 10);

async function startApplication() {
  try {
    console.log("Starting CMS with REST API integration...");

    // Connect to database
    await connectToDatabase();
    console.log("Database connection established");

    // Start the REST API server
    const apiServer = await setupApiServer();
    apiServer.listen(apiPort, () => {
      console.log(`REST API server listening on port ${apiPort}`);
    });

    // Start the content scheduler
    const schedulerService = new SchedulerService();
    schedulerService.start(schedulerInterval);
    console.log(
      `Content scheduler started with interval of ${schedulerInterval}ms`
    );

    // Handle application shutdown
    process.on("SIGINT", async () => {
      console.log("\nShutting down...");
      schedulerService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startApplication();
