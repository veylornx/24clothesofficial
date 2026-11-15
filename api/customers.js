const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const { requireAdmin } = require("./_auth");
const client = new MongoClient(process.env.MONGODB_URI);
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (!requireAdmin(req, res)) return;
  if (!process.env.MONGODB_URI) return res.status(500).json({ message: "Database is not configured" });
  if (!["GET", "PATCH"].includes(req.method)) return res.status(405).json({ message: "Method not allowed" });
  try {
    await client.connect();
    const db = client.db("24clothes"), customers = db.collection("customers");
    if (req.method === "GET") {
      const q = String(req.query?.q || "").trim();
      const filter = { isActive: { $ne: false } };
      if (q) filter.$or = [{ customerId: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { phone: { $regex: q.replace(/\D/g, "") || "$^" } }, { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }];
      const list = await customers.find(filter, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
      const ids = list.map(c => c.customerId);
      const counts = ids.length ? await db.collection("orders").aggregate([{ $match: { customerId: { $in: ids } } }, { $group: { _id: "$customerId", count: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, { $ifNull: ["$total", 0] }, 0] } } } }]).toArray() : [];
      const map = new Map(counts.map(x => [x._id, x]));
      return res.status(200).json({ success: true, total: await customers.countDocuments({ isActive: { $ne: false } }), customers: list.map(c => ({ ...c, orderCount: map.get(c.customerId)?.count || 0, totalSpent: map.get(c.customerId)?.spent || 0 })) });
    }
    const customerId = String(req.body?.customerId || "").trim().toUpperCase();
    const password = String(req.body?.password || "");
    if (!customerId || password.length < 8 || password.length > 72) return res.status(400).json({ message: "Customer ID and a password of at least 8 characters are required" });
    const result = await customers.updateOne({ customerId }, { $set: { passwordHash: await bcrypt.hash(password, 12), updatedAt: new Date() }, $inc: { tokenVersion: 1 } });
    if (!result.matchedCount) return res.status(404).json({ message: "Customer not found" });
    return res.status(200).json({ success: true, message: "Customer password reset successfully" });
  } catch (e) { console.error("customers API error", e); return res.status(500).json({ message: "Unable to process customers request" }); }
  finally { await client.close().catch(() => {}); }
};
