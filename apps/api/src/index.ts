import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const port = Number(process.env["PORT"] ?? 3001);

logger.info("Starting FlowLink API server", { port });

serve(
  { fetch: app.fetch, port },
  (info) => {
    logger.info("Server running", {
      url: `http://localhost:${info.port}`,
      version: process.env["APP_VERSION"] ?? "0.1.0",
      nodeEnv: process.env["NODE_ENV"] ?? "development",
    });
  },
);
