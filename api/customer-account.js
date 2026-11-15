const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const client = new MongoClient(process.env.MONGODB_URI);
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) return res.status(500).json({ message: "Customer account service is not configured" });
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Please log in" });
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { return res.status(401).json({ message: "Session expired. Please log in again." }); }
  if (payload.role !== "customer" || !payload.customerId) return res.status(403).json({ message: "Customer access required" });
  try {
    await client.connect();
    const db = client.db("24clothes");
    const customer = await db.collection("customers").findOne({ customerId: payload.customerId, isActive: { $ne: false } }, { projection: { passwordHash: 0 } });
    if (!customer) return res.status(404).json({ message: "Customer account not found" });
    if (Number(payload.tokenVersion || 0) !== Number(customer.tokenVersion || 0)) return res.status(401).json({ message: "Your session has expired. Please log in again." });
    const orders = await db.collection("orders").find({ customerId: payload.customerId }).sort({ createdAt: -1 }).limit(100).toArray();
    return res.status(200).json({ success: true, customer, orders });
  } catch (e) { console.error("customer-account error", e); return res.status(500).json({ message: "Unable to load your account" }); }
  finally { await client.close().catch(() => {}); }
};
