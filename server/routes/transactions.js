import { Router } from "express";
import { Transaction } from "../models.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
const validInput = (body) => {
  const errors = [];
  if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 120) errors.push("Title is required and must be 120 characters or fewer.");
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 1_000_000_000) errors.push("Amount must be greater than zero and at most 1,000,000,000.");
  if (!["income", "expense"].includes(body.type)) errors.push("Type must be income or expense.");
  if (typeof body.category !== "string" || !body.category.trim() || body.category.trim().length > 50) errors.push("Category is required and must be 50 characters or fewer.");
  if (!validDate(body.date)) errors.push("Date must use the YYYY-MM-DD format.");
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 500)) errors.push("Notes must be 500 characters or fewer.");
  return errors;
};

router.get("/", async (req, res, next) => {
  try {
    const filter = { user: req.user.id };
    if (["income", "expense"].includes(req.query.type)) filter.type = req.query.type;
    if (typeof req.query.category === "string" && req.query.category.length <= 50) filter.category = req.query.category;
    if (validDate(req.query.from) || validDate(req.query.to)) {
      filter.date = {};
      if (validDate(req.query.from)) filter.date.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (validDate(req.query.to)) filter.date.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const escaped = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ title: { $regex: escaped, $options: "i" } }, { category: { $regex: escaped, $options: "i" } }];
    }
    const sort = req.query.sort === "oldest" ? { date: 1 } : req.query.sort === "amount" ? { amount: -1 } : { date: -1 };
    const page = Math.max(1, Math.min(10_000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      Transaction.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);
    return res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const errors = validInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const item = await Transaction.create({
      user: req.user.id,
      title: req.body.title.trim(),
      amount: req.body.amount,
      type: req.body.type,
      category: req.body.category.trim(),
      date: new Date(`${req.body.date}T00:00:00.000Z`),
      notes: req.body.notes?.trim() || "",
    });
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const allowed = ["title", "amount", "type", "category", "date", "notes"];
    if (!req.body || Object.keys(req.body).some((key) => !allowed.includes(key)) || !Object.keys(req.body).length) {
      return res.status(400).json({ message: "Include only transaction fields you want to update." });
    }
    const current = await Transaction.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!current) return res.status(404).json({ message: "Transaction not found." });
    const merged = { ...current, ...req.body };
    if (typeof merged.amount === "string") merged.amount = Number(merged.amount);
    if (merged.date instanceof Date && !Number.isNaN(merged.date.getTime())) merged.date = merged.date.toISOString().slice(0, 10);
    else if (validDate(merged.date)) merged.date = merged.date.slice(0, 10);
    const errors = validInput(merged);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const update = {
      title: merged.title.trim(),
      amount: merged.amount,
      type: merged.type,
      category: merged.category.trim(),
      date: new Date(`${merged.date}T00:00:00.000Z`),
      notes: merged.notes?.trim() || "",
    };
    const item = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: update },
      { new: true, runValidators: true },
    );
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const item = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: "Transaction not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
