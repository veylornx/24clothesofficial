
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  let client;

  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db("24clothes");
    const products = db.collection("products");

    // Public: View all products
    if (req.method === "GET") {
      const result = await products
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        products: result
      });
    }

    // Admin authentication
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : "";

    let admin;

    try {
      admin = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Admin login required"
      });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Add product
    if (req.method === "POST") {
      const {
        name, category, price,
        photos, sizes, stock, description
      } = req.body || {};

      if (
        typeof name !== "string" || !name.trim() ||
        typeof category !== "string" || !category.trim() ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Array.isArray(photos) ||
        !Array.isArray(sizes) ||
        !Number.isFinite(Number(stock)) ||
        Number(stock) < 0 ||
        typeof description !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product information"
        });
      }

      const product = {
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        photos,
        sizes,
        stock: Number(stock),
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await products.insertOne(product);

      return res.status(201).json({
        success: true,
        message: "Product added",
        productId: result.insertedId
      });
    }

    // Edit or delete product
    if (req.method === "PUT" || req.method === "DELETE") {
      const { id } = req.query;

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid product ID required"
        });
      }

      const filter = { _id: new ObjectId(id) };

      if (req.method === "DELETE") {
        const result = await products.deleteOne(filter);

        return res.status(200).json({
          success: true,
          deleted: result.deletedCount === 1
        });
      }

      const {
        name, category, price,
        photos, sizes, stock, description
      } = req.body || {};

      const updates = {};

      if (typeof name === "string") updates.name = name.trim();
      if (typeof category === "string") updates.category = category.trim();
      if (price !== undefined && Number.isFinite(Number(price)) && Number(price) >= 0) updates.price = Number(price);
      if (Array.isArray(photos)) updates.photos = photos;
      if (Array.isArray(sizes)) updates.sizes = sizes;
      if (stock !== undefined && Number.isFinite(Number(stock)) && Number(stock) >= 0) updates.stock = Number(stock);
      if (typeof description === "string") updates.description = description;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid changes provided"
        });
      }

      updates.updatedAt = new Date();

      const result = await products.updateOne(
        filter,
        { $set: updates }
      );

      return res.status(200).json({
        success: true,
        updated: result.modifiedCount === 1
      });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });

  } catch (error) {
    console.error("Products API error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    if (client) await client.close();
  }
};
      
