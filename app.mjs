import express from "express";
import path from "path";
import { logger, morganMiddleware } from "./logging.mjs";
import { fileURLToPath } from "url";
import createBareServer from "@tomphttp/bare-server-node";
import { allowedDomains, allowedPrefixes, blacklistSources} from "./filters.mjs";
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
  const originalUrl = new URL(req.body.url);
  if (!allowedDomains.includes(originalUrl.host)) {
    return res.status(403).json({
      id: "error.Blocked",
      message: "This domain is not allowed to use the proxy.",
    });
  }

  if (!allowedPrefixes.includes(req.body.prefix)) {
    return res.status(403).json({
      id: "error.Blocked",
      message: "This prefix is not in the list of allowed prefixes.",
    });
  }

  let host = req.headers["x-forwarded-host"];
  host = host ? host : req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;

  const proxyUrl = originalUrl
  proxyUrl.host = [req.body.prefix, host].join(".");
  proxyUrl.protocol = protocol;

  const data = {
    id: crypto.randomBytes(16).toString("hex"),
    payload: req.body,
    mirror: proxyUrl.toString(),
  };
  const serializedData = JSON.stringify(data)

  const encodedUrl = encodeURIComponent(proxyUrl);

  redisClient.zAdd(encodedUrl, {
    score: Date.now(),
    value: serializedData,
  });

  redisClient.set(
    "id:" + data.id,
    serializedData,
  );

  return res.json({ id: data.id, mirror: data.mirror });
});

app.get("/v1/mirror/:url", async (req, res) => {
  const proxyUrl = new URL(req.params.url);
  if (!allowedPrefixes.includes(proxyUrl.host.split(".")[0])) {
    return res.status(403).json({
      id: "error.Blocked",
      message: "This prefix is not in the list of allowed prefixes.",
    });
  }

  const data = await redisClient.zRange(
    encodeURIComponent(proxyUrl),
    -1,
    -1,
  );

  if (!data) {
    return res.status(404).json({
      id: "error.404",
      message: "The resource does not exist.",
    });
  }

  return res.json(JSON.parse(data));
});

app.get("/v1/history/:url", async (req, res) => {
  const data = await redisClient.zRangeWithScores(encodeURIComponent(req.params.url), 0, -1);

  if (!data) {
    return res.status(404).json({
      id: "error.404",
      message: "The resource does not exist.",
    });
  }

  const result = data.map((item) => {
    return {
      id: JSON.parse(item.value).id,
      timestamp: item.score,
    };
  });

  return res.json(result);
});

app.get("/v1/data/:id", async (req, res) => {
  const data = await redisClient.get(
    "id:" + req.params.id,
  );

  if (!data) {
    return res.status(404).json({
      id: "error.404",
      message: "The resource does not exist.",
    });
  }

  return res.json(JSON.parse(data));
});

app.all("*", async (req, res) => {
  if (bareServer.shouldRoute(req)) {
    if (blacklistSources.includes(req.headers["x-bare-host"])) {
      res.writeHead(400, {
        "Content-Type": "text/plain",
      });
      return res.end("The request contains invalid source.");
    }

    return bareServer.routeRequest(req, res);
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