// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface User {
      userId: number;
    }

    interface Request {
      user?: User;
    }
  }
}
