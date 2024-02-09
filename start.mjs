import express from "express";
import fs from "fs";
import vhost from "vhost";
import http from "http";
import https from "https";
import app from "./app.mjs";

const privateKey  = fs.readFileSync("sslcert/lead-jobs.pjas.ch+1-key.pem");
const certificate = fs.readFileSync("sslcert/lead-jobs.pjas.ch+1.pem");

const server = express();

server.use(vhost("lead-jobs.pjas.ch", app));
server.use(vhost("*.lead-jobs.pjas.ch", app));

server.use(express.json());

const httpServer = http.createServer(server);
const httpsServer = https.createServer({key: privateKey, cert: certificate}, server);

httpServer.listen(8080);
httpsServer.listen(4433);
