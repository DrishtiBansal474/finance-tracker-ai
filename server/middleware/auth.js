import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { readSessionCookie } from "../session.js";

export async function requireAuth(req, res, next) {
  const token = readSessionCookie(req);
  if (!token) {
    return res.status(401).json({ message: "Sign in to continue." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(payload.sub);
    if (!user || payload.version !== user.tokenVersion) return res.status(401).json({ message: "Your session is no longer valid. Please sign in again." });
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }
    return next(error);
  }
}
