import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as config from "../config.ts";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };
    req.user = { userId: decoded.userId }; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};