import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { isStrongPassword } from "../../shared/password.js";
import { clearSessionCookie, setSessionCookie } from "../session.js";

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
  categories: user.categories,
});
const issueToken = (user) => jwt.sign(
  { sub: user.id, version: user.tokenVersion },
  process.env.JWT_SECRET,
  { algorithm: "HS256", expiresIn: "7d", issuer: "fintrack-ai", audience: "fintrack-ai-client" },
);

router.post("/register", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || email.length > 254 || !validPassword(password)) {
      return res.status(400).json({ message: "Enter a name and valid email. Passwords must be 8–72 characters and include uppercase and lowercase letters, a number, and a symbol." });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    setSessionCookie(res, issueToken(user));
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    if (!emailPattern.test(email) || typeof password !== "string") {
      return res.status(400).json({ message: "Enter a valid email address and password." });
    }
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "The email or password doesn’t look right." });
    }
    setSessionCookie(res, issueToken(user));
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["name", "email", "currency", "theme", "categories"];
    if (!req.body || !Object.keys(req.body).length || Object.keys(req.body).some((key) => !allowed.includes(key))) {
      return res.status(400).json({ message: "Include only profile or preference fields to update." });
    }
    const { name, email, currency, theme, categories } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
      }
      req.user.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !emailPattern.test(email.trim()) || email.trim().length > 254) {
        return res.status(400).json({ message: "Enter a valid email address." });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (await User.exists({ email: normalizedEmail, _id: { $ne: req.user.id } })) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }
      req.user.email = normalizedEmail;
    }
    if (currency !== undefined) {
      if (!["INR", "USD", "EUR", "GBP", "CAD", "AUD"].includes(currency)) {
        return res.status(400).json({ message: "Choose a supported currency." });
      }
      req.user.currency = currency;
    }
    if (theme !== undefined) {
      if (!["light", "dark"].includes(theme)) return res.status(400).json({ message: "Choose a supported theme." });
      req.user.theme = theme;
    }
    if (categories !== undefined) {
      if (!categories || typeof categories !== "object" || Array.isArray(categories)
        || !["income", "expense"].every((type) => Array.isArray(categories[type]))
        || Object.keys(categories).some((type) => !["income", "expense"].includes(type))) {
        return res.status(400).json({ message: "Provide income and expense category lists." });
      }
      for (const type of ["income", "expense"]) {
        const values = categories[type].map((value) => typeof value === "string" ? value.trim() : "");
        if (values.length > 50 || values.some((value) => !value || value.length > 50)
          || new Set(values.map((value) => value.toLowerCase())).size !== values.length) {
          return res.status(400).json({ message: "Categories must be unique names of 1 to 50 characters, with at most 50 per list." });
        }
        req.user.categories[type] = values;
      }
    }
    await req.user.save();
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    return next(error);
  }
});

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
