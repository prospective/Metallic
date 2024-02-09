import express from "express";
import fs from "fs";
import vhost from "vhost";
import http from "http";
import https from "https";
import app from "./app.mjs";
import dotenv from "dotenv";

const server = express();
dotenv.config();

const domain = process.env.DOMAIN || "localhost";

server.use(vhost(domain, app));
server.use(vhost(`*.${domain}`, app));

server.use(express.json());

const httpServer = http.createServer(server);
const httpsServer = https.createServer(
  {
    key: fs.readFileSync(process.env.SSL_KEY ||  "/etc/ssl/certs/key.pem"),
    cert: fs.readFileSync(process.env.SSL_CERT || "/etc/ssl/certs/cert.pem"),
  },
  server
);

httpServer.listen(8080);
httpsServer.listen(4433);
