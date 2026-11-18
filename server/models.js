import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  currency: { type: String, enum: ["INR", "USD", "EUR", "GBP", "CAD", "AUD"], default: "INR" },
  theme: { type: String, enum: ["light", "dark"], default: "light" },
  avatarUrl: { type: String, default: "" },
  tokenVersion: { type: Number, default: 0 },
  categories: {
    income: { type: [String], default: ["Salary", "Freelancing", "Investment", "Business"] },
    expense: { type: [String], default: ["Food", "Travel", "Shopping", "Health", "Education", "Entertainment", "Bills"] },
  },
  resetPasswordHash: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true, strict: "throw" });

const transactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  amount: { type: Number, required: true, min: 0.01, max: 1_000_000_000 },
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  date: { type: Date, required: true },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
}, { timestamps: true, strict: "throw" });
transactionSchema.index({ user: 1, date: -1 });

const budgetSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  limit: { type: Number, required: true, min: 1, max: 1_000_000_000 },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
}, { timestamps: true, strict: "throw" });
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

const goalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  target: { type: Number, required: true, min: 1, max: 1_000_000_000 },
  saved: { type: Number, min: 0, default: 0 },
  deadline: { type: Date, default: null },
  icon: { type: String, enum: ["target", "laptop", "plane", "shield"], default: "target" },
}, { timestamps: true, strict: "throw" });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export const Budget = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
export const Goal = mongoose.models.Goal || mongoose.model("Goal", goalSchema);
