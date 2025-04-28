import express from "express";
import cors from "cors";
import helmet from "helmet";
import { campaignRoutes } from "./routes/campaign.routes.js";
import { planRoutes } from "./routes/plan.routes.js";
import { contentRoutes } from "./routes/content.routes.js";
import { brandRoutes } from "./routes/brand.routes.js";
import { errorHandler } from "../utils/errors.js";
import { setupSwagger } from "./swagger.js";
import bodyParser from "body-parser";
const { json } = bodyParser;

export async function setupApiServer() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(json());

  // Health check endpoint
  app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Swagger documentation
  setupSwagger(app);

  // Routes
  app.use("/api/v1/campaigns", campaignRoutes);
  app.use("/api/v1/plans", planRoutes);
  app.use("/api/v1/content", contentRoutes);
  app.use("/api/v1/brands", brandRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
