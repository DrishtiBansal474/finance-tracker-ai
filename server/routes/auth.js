import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { isStrongPassword } from "../../shared/password.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validPassword = (password) => isStrongPassword(password) && Buffer.byteLength(password, "utf8") <= 72;
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  currency: user.currency,
  theme: user.theme,
  avatarUrl: user.avatarUrl,
});
const issueToken = (user) => jwt.sign(
  { sub: user.id, version: user.tokenVersion },
  process.env.JWT_SECRET,
  { algorithm: "HS256", expiresIn: "7d", issuer: "fintrack-ai", audience: "fintrack-ai-client" },
);

router.post("/register", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || email.length > 254 || !validPassword(password)) {
      return res.status(400).json({ message: "Enter a name and valid email. Passwords must be 8–72 characters and include uppercase and lowercase letters, a number, and a symbol." });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    if (!emailPattern.test(email) || typeof password !== "string") {
      return res.status(400).json({ message: "Enter a valid email address and password." });
    }
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "The email or password doesn’t look right." });
    }
    return res.json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || !validPassword(newPassword)) {
      return res.status(400).json({ message: "Enter your current password and a new password that is 8–72 characters and includes uppercase and lowercase letters, a number, and a symbol." });
    }
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Your current password doesn’t match." });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1;
    await user.save();
    return res.json({ message: "Password updated. Please sign in again." });
  } catch (error) {
    return next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ message: "Enter a valid email address." });
    const genericMessage = "If an account exists for that email, a password reset link will be sent.";
    const user = await User.findOne({ email }).select("+resetPasswordHash +resetPasswordExpires");
    if (!user) return res.json({ message: genericMessage });
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl: `${origin.replace(/\/$/, "")}/reset-password/${token}` });
    } catch (mailError) {
      console.error("Password reset email delivery failed:", mailError.message);
    }
    return res.json({ message: genericMessage });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || !validPassword(password)) {
      return res.status(400).json({ message: "Use a valid reset link and a password that is 8–72 characters and includes uppercase and lowercase letters, a number, and a symbol." });
    }
    const resetHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordHash: resetHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordHash +resetPasswordExpires");
    if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired. Request a new one." });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordHash = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion += 1;
    await user.save();
    return res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    return next(error);
  }
});

export default router;
