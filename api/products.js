const { MongoClient, ObjectId } = require("mongodb");
const { requireAdmin } = require("./_auth");
const client = new MongoClient(process.env.MONGODB_URI);
const validId = id => ObjectId.isValid(String(id || ""));
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) return res.status(405).json({ message: "Method not allowed" });
  if (req.method !== "GET" && !requireAdmin(req, res)) return;
  if (!process.env.MONGODB_URI) return res.status(500).json({ message: "Database is not configured" });
  try {
    await client.connect();
    const col = client.db("24clothes").collection("products");
    if (req.method === "GET") {
      const products = await col.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ success: true, products });
    }
    if (req.method === "POST") {
      const p = req.body || {};
      const doc = { name: String(p.name || "").trim(), category: String(p.category || "").trim(), price: Number(p.price), stock: Math.max(0, Math.floor(Number(p.stock) || 0)), photos: Array.isArray(p.photos) ? p.photos : [], sizes: Array.isArray(p.sizes) ? p.sizes : [], description: String(p.description || ""), createdAt: new Date(), updatedAt: new Date() };
      if (!doc.name || !doc.category || !Number.isFinite(doc.price) || doc.price < 0) return res.status(400).json({ message: "Name, category and valid price are required" });
      const result = await col.insertOne(doc);
      return res.status(201).json({ success: true, product: { ...doc, _id: result.insertedId } });
    }
    const id = String(req.query?.id || req.body?.id || "");
    if (!validId(id)) return res.status(400).json({ message: "Valid product ID is required" });
    const _id = new ObjectId(id);
    if (req.method === "PUT") {
      const p = req.body || {};
      const update = { name: String(p.name || "").trim(), category: String(p.category || "").trim(), price: Number(p.price), stock: Math.max(0, Math.floor(Number(p.stock) || 0)), photos: Array.isArray(p.photos) ? p.photos : [], sizes: Array.isArray(p.sizes) ? p.sizes : [], description: String(p.description || ""), updatedAt: new Date() };
      if (!update.name || !update.category || !Number.isFinite(update.price) || update.price < 0) return res.status(400).json({ message: "Name, category and valid price are required" });
      const result = await col.updateOne({ _id }, { $set: update });
      if (!result.matchedCount) return res.status(404).json({ message: "Product not found" });
      return res.status(200).json({ success: true, message: "Product updated" });
    }
    const result = await col.deleteOne({ _id });
    if (!result.deletedCount) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json({ success: true, message: "Product deleted" });
  } catch (e) { console.error("products API error", e); return res.status(500).json({ message: "Unable to process products request" }); }
  finally { await client.close().catch(() => {}); }
};
