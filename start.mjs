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
httpServer.listen(8080);

if (process.env.USE_HTTPS === "true") {
  if (!process.env.SSL_KEY || !process.env.SSL_CERT) {
    throw new Error("SSL_KEY and SSL_CERT must be set when USE_HTTPS is true.");
  }

  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT),
    },
    server
  );
  
  
  httpsServer.listen(4433);
}