const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const client = new MongoClient(process.env.MONGODB_URI);
function safeOrder(o) {
  return {
    orderId: o.orderId, customerName: o.customerName || "", customerPhone: o.customerPhone || "",
    deliveryArea: o.deliveryArea || "", address: o.address || "", items: o.items || [],
    subtotal: Number(o.subtotal || 0), deliveryCharge: Number(o.deliveryCharge || 0), total: Number(o.total || 0),
    paymentMethod: o.paymentMethod || "", transactionId: o.transactionId || "", referralCode: o.referralCode || "",
    note: o.note || "", status: o.status || "Pending", createdAt: o.createdAt || null, updatedAt: o.updatedAt || null
  };
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) return res.status(500).json({ message: "Customer orders are not configured" });
  const tokens = Array.isArray(req.body?.tokens) ? req.body.tokens.slice(0, 30) : [];
  if (!tokens.length) return res.status(400).json({ message: "No saved orders found" });
  const ids = [];
  for (const token of tokens) {
    try {
      const p = jwt.verify(String(token), process.env.JWT_SECRET);
      if (p.type === "order_access" && p.orderId) ids.push(String(p.orderId));
    } catch (_) {}
  }
  if (!ids.length) return res.status(401).json({ message: "Saved access expired. Track your order once to add it again." });
  try {
    await client.connect();
    const docs = await client.db("24clothes").collection("orders").find({ orderId: { $in: [...new Set(ids)] } }).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({ success: true, orders: docs.map(safeOrder) });
  } catch (e) {
    console.error("customer-orders error", e);
    return res.status(500).json({ message: "Unable to load your orders right now" });
  } finally { await client.close().catch(() => {}); }
};
