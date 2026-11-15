const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const client = new MongoClient(process.env.MONGODB_URI);
const digits = v => String(v || "").replace(/\D/g, "");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) return res.status(500).json({ message: "Order linking is not configured" });
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Please log in to your customer account" });
  let account;
  try { account = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { return res.status(401).json({ message: "Customer session expired" }); }
  if (account.role !== "customer" || !account.customerId) return res.status(403).json({ message: "Customer account required" });
  const orderId = String(req.body?.orderId || "").trim(), accessToken = String(req.body?.accessToken || "");
  if (!orderId || !accessToken) return res.status(400).json({ message: "Verified order details are required" });
  let orderAccess;
  try { orderAccess = jwt.verify(accessToken, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: "Please verify this order again" }); }
  if (orderAccess.type !== "order_access" || orderAccess.orderId !== orderId) return res.status(403).json({ message: "Order verification does not match" });
  try {
    await client.connect();
    const db = client.db("24clothes");
    const customer = await db.collection("customers").findOne({ customerId: account.customerId, isActive: { $ne: false } });
    if (!customer) return res.status(404).json({ message: "Customer account not found" });
    if (Number(account.tokenVersion || 0) !== Number(customer.tokenVersion || 0)) return res.status(401).json({ message: "Your customer session has expired" });
    const order = await db.collection("orders").findOne({ orderId });
    if (!order || digits(order.customerPhone) !== digits(customer.phone)) return res.status(403).json({ message: "This order phone number does not match your customer account" });
    if (order.customerId && order.customerId !== account.customerId) return res.status(409).json({ message: "This order is already linked to another customer account" });
    await db.collection("orders").updateOne({ orderId, $or: [{ customerId: { $exists: false } }, { customerId: null }, { customerId: account.customerId }] }, { $set: { customerId: account.customerId, updatedAt: new Date() } });
    return res.status(200).json({ success: true, message: "Previous order added to your account" });
  } catch (e) { console.error("customer-claim-order error", e); return res.status(500).json({ message: "Unable to link this order" }); }
  finally { await client.close().catch(() => {}); }
};
