import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import roomRoutes from "./routes/room.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: `${process.env.FRONTEND_URL || "http://localhost:5173"}`,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/rooms", roomRoutes);

app.use(errorMiddleware);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    message: "StayInn API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`StayInn server running on port ${PORT}`);
});
