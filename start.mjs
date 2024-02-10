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

const httpServer = http.createServer(server);
httpServer.listen(process.env.HTTP_PORT || 80);

if ((process.env.USE_HTTPS || "true") === "true") {
  if (!process.env.SSL_KEY || !process.env.SSL_CERT) {
    throw new Error("SSL_KEY and SSL_CERT must be set when USE_HTTPS is true.");
  }

  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(process.env.SSL_KEY || "/etc/ssl/certs/key.pem"),
      cert: fs.readFileSync(process.env.SSL_CERT || "/etc/ssl/certs/cert.pem"),
    },
    server
  );
  
  httpsServer.listen(process.env.HTTPS_PORT || 443);
}