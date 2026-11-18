import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import authRoutes from "./routes/auth.js";
import planningRoutes from "./routes/planning.js";
import transactionRoutes from "./routes/transactions.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fintrack-ai";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production.");
  }
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api", planningRoutes);
app.use("/api/transactions", transactionRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "An unexpected server error occurred." });
});

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start();
