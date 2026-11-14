
const { MongoClient } = require("mongodb");

module.exports = async (req, res) => {
  let client;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db("24clothes");
    await db.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: "24 Clothes Database Connected Successfully!"
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  } finally {
    if (client) await client.close();
  }
};
