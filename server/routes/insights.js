import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../models.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/analyze", async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const transactions = await Transaction.find({
      user: req.user.id,
      date: { $gte: previousStart, $lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) },
    }).select("amount type category date").lean();
    const current = transactions.filter((item) => item.date >= monthStart);
    const previous = transactions.filter((item) => item.date < monthStart);
    const total = (items, type) => items
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = new Map();
    current.filter((item) => item.type === "expense").forEach((item) => {
      categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + item.amount);
    });
    const topCategory = [...categoryTotals].sort((a, b) => b[1] - a[1])[0];
    const summary = {
      currentMonthIncome: total(current, "income"),
      currentMonthExpenses: total(current, "expense"),
      previousMonthExpenses: total(previous, "expense"),
      topExpenseCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    };

    if (!process.env.GEMINI_API_KEY) {
      const localInsight = topCategory
        ? `You spent ${summary.currentMonthExpenses.toFixed(2)} this month. ${topCategory[0]} is your largest expense category at ${topCategory[1].toFixed(2)}.`
        : "There isn’t enough spending data for this month yet. Add a few transactions to get a useful breakdown.";
      return res.json({ insights: localInsight, source: "local" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: `Give one concise, non-judgmental personal-finance observation and one practical suggestion based only on these totals. Do not give investment or legal advice. Data: ${JSON.stringify(summary)}`,
    });
    const insights = response.text?.trim();
    if (!insights) return res.status(502).json({ message: "The AI service returned an empty response. Please try again." });
    return res.json({ insights, source: "gemini" });
  } catch (error) {
    return next(error);
  }
});

export default router;
