import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/runtime.js";
import roomRoutes from "./routes/room.routes.js";
import roomTypeRoutes from "./routes/roomType.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { verifyRequestOrigin } from "./middleware/origin.middleware.js";
import { prisma } from "./lib/prisma.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(verifyRequestOrigin);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    console.error("Database readiness check failed");
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api/rooms", roomRoutes);
app.use("/api/room-types", roomTypeRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

export default app;
