import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, this same Express server also serves the built React
// storefront and the static game assets. The build step puts the storefront
// build at `artifacts/store/dist/public/` (which already includes the static
// `game/` folder copied from `artifacts/store/public/game/`).
const storeDistPath = path.resolve(
  __dirname,
  "..",
  "..",
  "store",
  "dist",
  "public",
);

if (existsSync(storeDistPath)) {
  logger.info({ storeDistPath }, "Serving static frontend");
  app.use(express.static(storeDistPath, { index: "index.html" }));

  // SPA fallback: any non-API GET that isn't a real file falls back to
  // the React app's index.html so wouter can route it.
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(storeDistPath, "index.html"));
  });
} else {
  logger.info(
    { storeDistPath },
    "Storefront build not found; running API only (dev mode).",
  );
}

export default app;
