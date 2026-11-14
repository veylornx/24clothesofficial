const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const client = new MongoClient(process.env.MONGODB_URI);
function verifyBearer(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) throw new Error("Unauthorized");
  return jwt.verify(h.slice(7), process.env.JWT_SECRET);
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (!process.env.MONGODB_URI) return res.status(500).json({ message: "Database is not configured" });
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Server authentication is not configured" });
  let auth;
  try { auth = verifyBearer(req); } catch { return res.status(401).json({ message: "Unauthorized" }); }
  const isAdmin = auth.role === "admin", isCustomer = auth.type === "order_access" && !!auth.orderId;
  if (!isAdmin && !isCustomer) return res.status(403).json({ message: "Forbidden" });
  const orderId = isAdmin ? String((req.method === "GET" ? req.query.orderId : req.body?.orderId) || "").trim() : String(auth.orderId);
  if (!orderId) return res.status(400).json({ message: "Order ID is required" });
  if (isCustomer && req.method === "POST" && req.body?.orderId && String(req.body.orderId) !== orderId) return res.status(403).json({ message: "Forbidden" });
  try {
    await client.connect();
    const col = client.db("24clothes").collection("orders");
    const order = await col.findOne({ orderId }, { projection: { messages: 1 } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (req.method === "GET") return res.status(200).json({ messages: order.messages || [] });
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 1000) return res.status(400).json({ message: "Message must be between 1 and 1000 characters" });
    const item = { sender: isAdmin ? "admin" : "customer", message, createdAt: new Date() };
    await col.updateOne({ orderId }, { $push: { messages: { $each: [item], $slice: -200 } }, $set: { updatedAt: new Date() } });
    return res.status(201).json({ message: "Message sent", item });
  } catch (e) { console.error("order-messages error", e); return res.status(500).json({ message: "Unable to process message" }); }
  finally { await client.close().catch(() => {}); }
};
