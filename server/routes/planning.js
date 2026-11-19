import { Router } from "express";
import { Budget, Goal, Transaction } from "../models.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const validMonth = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

router.get("/budgets", async (req, res, next) => {
  try {
    const month = validMonth(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const [budgets, usage] = await Promise.all([
      Budget.find({ user: req.user.id, month }).sort({ category: 1 }).lean(),
      Transaction.aggregate([
        { $match: { user: req.user._id, type: "expense", date: { $gte: start, $lt: end } } },
        { $group: { _id: "$category", spent: { $sum: "$amount" } } },
      ]),
    ]);
    const spent = new Map(usage.map((row) => [row._id, row.spent]));
    return res.json({ month, items: budgets.map((item) => ({ ...item, spent: spent.get(item.category) || 0 })) });
  } catch (error) {
    return next(error);
  }
});

router.put("/budgets", async (req, res, next) => {
  try {
    const { category, limit } = req.body;
    const month = validMonth(req.body.month) ? req.body.month : new Date().toISOString().slice(0, 7);
    if (typeof category !== "string" || !category.trim() || category.trim().length > 50 || typeof limit !== "number" || !Number.isFinite(limit) || limit < 1 || limit > 1_000_000_000) {
      return res.status(400).json({ message: "Provide a category and a monthly limit greater than zero." });
    }
    const item = await Budget.findOneAndUpdate(
      { user: req.user.id, category: category.trim(), month },
      { $set: { limit } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.get("/goals", async (req, res, next) => {
  try {
    const items = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/goals", async (req, res, next) => {
  try {
    const { name, target, deadline, icon = "target" } = req.body;
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100 || typeof target !== "number" || !Number.isFinite(target) || target < 1 || target > 1_000_000_000) {
      return res.status(400).json({ message: "Enter a goal name and a target greater than zero." });
    }
    if (!["target", "laptop", "plane", "shield"].includes(icon)) return res.status(400).json({ message: "Choose a supported goal icon." });
    let parsedDeadline = null;
    if (deadline) {
      if (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(new Date(`${deadline}T00:00:00.000Z`).getTime())) {
        return res.status(400).json({ message: "Deadline must use the YYYY-MM-DD format." });
      }
      parsedDeadline = new Date(`${deadline}T00:00:00.000Z`);
    }
    const item = await Goal.create({ user: req.user.id, name: name.trim(), target, deadline: parsedDeadline, icon });
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.patch("/goals/:id", async (req, res, next) => {
  try {
    const { name, target, deadline, icon } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) return res.status(400).json({ message: "Goal name must be between 1 and 100 characters." });
      updates.name = name.trim();
    }
    if (target !== undefined) {
      if (typeof target !== "number" || !Number.isFinite(target) || target < 1 || target > 1_000_000_000) return res.status(400).json({ message: "Target must be greater than zero." });
      updates.target = target;
    }
    if (deadline !== undefined) {
      if (deadline === null || deadline === "") updates.deadline = null;
      else if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && !Number.isNaN(new Date(`${deadline}T00:00:00.000Z`).getTime())) updates.deadline = new Date(`${deadline}T00:00:00.000Z`);
      else return res.status(400).json({ message: "Deadline must use the YYYY-MM-DD format." });
    }
    if (icon !== undefined) {
      if (!["target", "laptop", "plane", "shield"].includes(icon)) return res.status(400).json({ message: "Choose a supported goal icon." });
      updates.icon = icon;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Include a goal field to update." });
    const item = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Goal not found." });
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/goals/:id/contributions", async (req, res, next) => {
  try {
    const amount = req.body.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return res.status(400).json({ message: "Contribution must be greater than zero." });
    const item = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: "Goal not found." });
    item.saved = Math.min(item.target, item.saved + amount);
    await item.save();
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/goals/:id", async (req, res, next) => {
  try {
    const item = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: "Goal not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
