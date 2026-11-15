const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { requireAdmin } = require("./_auth");
const client = new MongoClient(process.env.MONGODB_URI);
const digits = v => String(v || "").replace(/\D/g, "");
const allowed = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method)) return res.status(405).json({ message: "Method not allowed" });
  if (req.method !== "POST" && !requireAdmin(req, res)) return;
  if (!process.env.MONGODB_URI) return res.status(500).json({ message: "Database is not configured" });
  if (req.method === "POST" && !process.env.JWT_SECRET) return res.status(500).json({ message: "Customer order access is not configured" });
  let reserved = [];
  try {
    await client.connect();
    const db = client.db("24clothes"), orders = db.collection("orders"), products = db.collection("products");
    if (req.method === "GET") {
      const list = await orders.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, orders: list });
    }
    if (req.method === "PATCH") {
      const orderId = String(req.body?.orderId || "").trim(), status = String(req.body?.status || "");
      if (!orderId || !allowed.includes(status)) return res.status(400).json({ message: "Valid order ID and status are required" });
      const result = await orders.updateOne({ orderId }, { $set: { status, updatedAt: new Date() } });
      if (!result.matchedCount) return res.status(404).json({ message: "Order not found" });
      return res.status(200).json({ success: true, message: "Order status updated" });
    }
    const b = req.body || {}, itemsIn = Array.isArray(b.items) ? b.items : [];
    const customerName = String(b.customerName || "").trim(), customerPhone = String(b.customerPhone || "").trim();
    const deliveryArea = String(b.deliveryArea || ""), address = String(b.address || "").trim();
    if (!customerName || !/^01[3-9]\d{8}$/.test(digits(customerPhone)) || !address || !["inside", "outside"].includes(deliveryArea) || !itemsIn.length) return res.status(400).json({ message: "Please provide valid customer, delivery and item details" });
    let accountCustomerId = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      let account;
      try { account = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET); }
      catch { return res.status(401).json({ message: "Your customer session expired. Please log in again." }); }
      if (account.role !== "customer" || !account.customerId) return res.status(403).json({ message: "Invalid customer account session" });
      const linkedCustomer = await db.collection("customers").findOne({ customerId: account.customerId, isActive: { $ne: false } });
      if (!linkedCustomer || Number(account.tokenVersion || 0) !== Number(linkedCustomer.tokenVersion || 0)) return res.status(401).json({ message: "Your customer session has expired. Please log in again." });
      if (digits(linkedCustomer.phone) !== digits(customerPhone)) return res.status(403).json({ message: "The checkout phone number must match your customer account" });
      accountCustomerId = linkedCustomer.customerId;
    }
    if (!b.paymentMethod || !String(b.transactionId || "").trim()) return res.status(400).json({ message: "Payment method and Transaction ID are required" });
    const items = [];
    for (const input of itemsIn) {
      const productId = String(input.productId || ""), quantity = Math.floor(Number(input.quantity));
      if (!ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 1 || !String(input.size || "").trim()) throw Object.assign(new Error("Invalid product, size or quantity"), { status: 400 });
      const p = await products.findOneAndUpdate({ _id: new ObjectId(productId), stock: { $gte: quantity } }, { $inc: { stock: -quantity }, $set: { updatedAt: new Date() } }, { returnDocument: "before" });
      const product = p && (p.value || p);
      if (!product || !product._id) throw Object.assign(new Error("Sorry, this product is sold out or the requested quantity is unavailable. Please refresh the page."), { status: 409 });
      reserved.push({ _id: product._id, quantity });
      const sizes = Array.isArray(product.sizes) ? product.sizes.map(s => typeof s === "object" ? (s.name || s.size) : s) : [];
      if (sizes.length && !sizes.includes(String(input.size))) throw Object.assign(new Error("Selected size is not available"), { status: 400 });
      items.push({ productId: String(product._id), name: product.name, category: product.category, price: Number(product.price), size: String(input.size), quantity });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0), deliveryCharge = deliveryArea === "inside" ? 60 : 135;
    const orderId = `24CL-${new Date().getFullYear()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const order = { orderId, customerId: accountCustomerId, customerName, customerPhone, deliveryArea, address, items, subtotal, deliveryCharge, total: subtotal + deliveryCharge, paymentMethod: String(b.paymentMethod), transactionId: String(b.transactionId).trim(), referralCode: String(b.referralCode || "").trim(), note: String(b.note || "").trim(), status: "Pending", messages: [], createdAt: new Date(), updatedAt: new Date() };
    await orders.insertOne(order);
    const accessToken = jwt.sign({ type: "order_access", orderId }, process.env.JWT_SECRET, { expiresIn: "90d", jwtid: crypto.randomUUID() });
    return res.status(201).json({ success: true, orderId, order, accessToken });
  } catch (e) {
    for (const item of reserved.reverse()) await dbSafeRestore(client, item).catch(err => console.error("stock rollback failed", err));
    console.error("orders API error", e);
    return res.status(e.status || 500).json({ message: e.status ? e.message : "Unable to process order right now" });
  } finally { await client.close().catch(() => {}); }
};
async function dbSafeRestore(client, item) {
  await client.db("24clothes").collection("products").updateOne({ _id: item._id }, { $inc: { stock: item.quantity }, $set: { updatedAt: new Date() } });
}
