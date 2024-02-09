import express from "express";
import path from "path";
import { logger, morganMiddleware } from "./logging.mjs";
import { fileURLToPath } from "url";
import createBareServer from "@tomphttp/bare-server-node";
import block from "./blocklist/block.json" assert { type: "json" };
import crypto from "crypto";
import { createClient } from "redis";
import fs from "fs";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "build")));
app.use(morganMiddleware);

// Run the Bare server in the /bare/ namespace. This will prevent conflicts between the static files and the bare server.
const bareServer = createBareServer("/bare/", {
  logErrors: false,
  localAddress: undefined
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});
redisClient.on("error", (err) => console.log("Redis Client Error", err));
await redisClient.connect();

app.post("/v1/proxy", (req, res) => {
  const proxyHost = req.headers["x-forwarded-host"];
  const host = proxyHost ? proxyHost : req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;

  const data = {
    id: crypto.randomBytes(16).toString("hex"),
    payload: req.body,
  };

  const proxyUrl = new URL(req.body.url);
  proxyUrl.host = [data.payload.prefix, host].join(".");
  proxyUrl.protocol = protocol;

  redisClient.set(
    "path:" + encodeURIComponent(proxyUrl),
    JSON.stringify(data),
    "EX",
    60 * 60 * 24 * 7
  );

  return res.json({ id: data.id, mirror: proxyUrl });
});

app.get("/v1/data/:path", async (req, res) => {
  const data = await redisClient.get(
    "path:" + encodeURIComponent(req.params.path)
  );

  if (!data) {
    return res.status(404).json({
      id: "error.404",
      message: "The page does not exist.",
    });
  }

  return res.json(JSON.parse(data));
});

app.get("*", async (req, res) => {
  if (bareServer.shouldRoute(req)) {
    if (block.includes(req.headers["x-bare-host"])) {
      return res.status(403).json({
        id: "error.Blocked",
        message: "Header was blocked by the owner of this site.",
      });
    }

    return bareServer.routeRequest(req, res);
  }

  if (req.url.startsWith("/ultraviolet/") || req.url.trim() === "/") {
    return res.status(400).json({
      id: "error.invalidPath",
      message: "The request contains invalid path.",
    });
  }

  res.writeHead(200, { "content-type": "text/html" });
  fs.createReadStream(path.join(__dirname, "build", "index.html")).pipe(res);
});

app.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

export { app as default };