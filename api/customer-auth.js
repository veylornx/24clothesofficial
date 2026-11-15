const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const client = new MongoClient(process.env.MONGODB_URI);
const digits = v => String(v || "").replace(/\D/g, "");
const cleanCustomer = c => ({ customerId: c.customerId, name: c.name, phone: c.phone, email: c.email || "", createdAt: c.createdAt });
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) return res.status(500).json({ message: "Customer accounts are not configured" });
  const b = req.body || {}, action = String(b.action || "login").toLowerCase();
  try {
    await client.connect();
    const db = client.db("24clothes"), customers = db.collection("customers");
    await customers.createIndex({ customerId: 1 }, { unique: true });
    await customers.createIndex({ phone: 1 }, { unique: true });
    if (action === "register") {
      const name = String(b.name || "").trim().slice(0, 80);
      const phone = digits(b.phone);
      const email = String(b.email || "").trim().toLowerCase().slice(0, 160);
      const password = String(b.password || "");
      if (name.length < 2 || !/^01[3-9]\d{8}$/.test(phone)) return res.status(400).json({ message: "Please enter your name and a valid Bangladesh phone number" });
      if (password.length < 8 || password.length > 72) return res.status(400).json({ message: "Password must be at least 8 characters" });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (await customers.findOne({ phone }, { projection: { _id: 1 } })) return res.status(409).json({ message: "An account with this phone number already exists. Please log in." });
      const counter = await db.collection("counters").findOneAndUpdate({ _id: "customerSequence" }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: "after" });
      const sequence = Number((counter && (counter.sequence ?? counter.value?.sequence)) || 1);
      const customerId = "#" + String(sequence).padStart(3, "0");
      const doc = { customerId, name, phone, email, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date(), updatedAt: new Date(), isActive: true, tokenVersion: 0 };
      try { await customers.insertOne(doc); }
      catch (e) { if (e.code === 11000) return res.status(409).json({ message: "This phone number is already registered" }); throw e; }
      const token = jwt.sign({ role: "customer", customerId, tokenVersion: Number(doc.tokenVersion || 0) }, process.env.JWT_SECRET, { expiresIn: "30d" });
      return res.status(201).json({ success: true, token, customer: cleanCustomer(doc) });
    }
    if (action === "login") {
      const customerId = String(b.customerId || "").trim().toUpperCase();
      const password = String(b.password || "");
      if (!/^#\d{3,}$/.test(customerId) || !password) return res.status(400).json({ message: "Enter your Customer ID and password" });
      const customer = await customers.findOne({ customerId, isActive: { $ne: false } });
      if (!customer || !await bcrypt.compare(password, customer.passwordHash || "")) return res.status(401).json({ message: "Incorrect Customer ID or password" });
      await customers.updateOne({ _id: customer._id }, { $set: { lastLoginAt: new Date() } });
      const token = jwt.sign({ role: "customer", customerId, tokenVersion: Number(customer.tokenVersion || 0) }, process.env.JWT_SECRET, { expiresIn: "30d" });
      return res.status(200).json({ success: true, token, customer: cleanCustomer(customer) });
    }
    return res.status(400).json({ message: "Unknown account action" });
  } catch (e) {
    console.error("customer-auth error", e);
    return res.status(500).json({ message: "Unable to process customer account request" });
  } finally { await client.close().catch(() => {}); }
};
