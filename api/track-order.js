const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const client = new MongoClient(process.env.MONGODB_URI);
const digits = v => String(v || "").replace(/\D/g, "");
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
  const { orderId, phone } = req.body || {};
  if (!orderId || !phone) return res.status(400).json({ message: "Order ID and phone are required" });
  if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) return res.status(500).json({ message: "Server authentication is not configured" });
  try {
    await client.connect();
    const db = client.db("24clothes");
    const order = await db.collection("orders").findOne({ orderId: String(orderId).trim() });
    if (!order || digits(order.customerPhone) !== digits(phone)) return res.status(404).json({ message: "Order not found. Check your Order ID and mobile number." });
    const accessToken = jwt.sign({ type: "order_access", orderId: order.orderId }, process.env.JWT_SECRET, { expiresIn: "90d", jwtid: crypto.randomUUID() });
    return res.status(200).json({ success: true, order: safeOrder(order), accessToken });
  } catch (e) { console.error("track-order error", e); return res.status(500).json({ message: "Unable to track order right now" }); }
  finally { await client.close().catch(() => {}); }
};
