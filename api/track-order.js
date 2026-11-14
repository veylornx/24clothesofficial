const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const client = new MongoClient(process.env.MONGODB_URI);
const digits = v => String(v || "").replace(/\D/g, "");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const { orderId, phone } = req.body || {};
  if (!orderId || !phone) return res.status(400).json({ message: "Order ID and phone are required" });
  if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Server authentication is not configured" });
  try {
    await client.connect();
    const db = client.db("24clothes");
    const order = await db.collection("orders").findOne({ orderId: String(orderId).trim() });
    if (!order || digits(order.customerPhone) !== digits(phone)) return res.status(404).json({ message: "Order not found. Check your Order ID and mobile number." });
    const accessToken = jwt.sign({ type: "order_access", orderId: order.orderId }, process.env.JWT_SECRET, { expiresIn: "30d", jwtid: crypto.randomUUID() });
    const safeOrder = { orderId: order.orderId, items: order.items || [], subtotal: order.subtotal || 0, deliveryCharge: order.deliveryCharge || 0, total: order.total || 0, status: order.status || "Pending", createdAt: order.createdAt || null, updatedAt: order.updatedAt || null };
    return res.status(200).json({ order: safeOrder, accessToken });
  } catch (e) { console.error("track-order error", e); return res.status(500).json({ message: "Unable to track order right now" }); }
  finally { await client.close().catch(() => {}); }
};
