const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGODB_URI);
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.MONGODB_URI) return res.status(500).json({ message: "Database is not configured" });
  try {
    await client.connect();
    const total = await client.db("24clothes").collection("customers").countDocuments({ isActive: { $ne: false } });
    return res.status(200).json({ success: true, total });
  } catch (e) { console.error("customers-count error", e); return res.status(500).json({ message: "Unable to load customer count" }); }
  finally { await client.close().catch(() => {}); }
};
