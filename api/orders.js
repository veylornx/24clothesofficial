
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned"
];

function isAdmin(req) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function createOrderId() {
  const date = new Date();
  const year = date.getFullYear();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `24CL-${year}-${random}`;
}

module.exports = async (req, res) => {
  let db;

  try {
    await client.connect();
    db = client.db("24clothes");

    // ADMIN: View all orders
    if (req.method === "GET") {
      if (!isAdmin(req)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const orders = await db.collection("orders")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        orders
      });
    }

    // CUSTOMER: Place an order
    if (req.method === "POST") {
      const {
        customerName,
        customerPhone,
        deliveryArea,
        address,
        items,
        paymentMethod,
        transactionId,
        referralCode,
        note
      } = req.body || {};

      if (
        !customerName ||
        !customerPhone ||
        !deliveryArea ||
        !address ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required order details."
        });
      }

      const phone = normalizePhone(customerPhone);

      if (phone.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number."
        });
      }

      const deliveryText = String(deliveryArea).toLowerCase();

      let deliveryCharge;

      if (
        deliveryText.includes("inside") ||
        deliveryText.includes("chattogram") ||
        deliveryText.includes("chittagong")
      ) {
        deliveryCharge = 60;
      } else {
        deliveryCharge = 135;
      }

      const verifiedItems = [];
      let subtotal = 0;

      for (const item of items) {
        if (
          !ObjectId.isValid(item.productId) ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          Number(item.quantity) > 20
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid product or quantity."
          });
        }

        const product = await db.collection("products").findOne({
          _id: new ObjectId(item.productId)
        });

        if (!product) {
          return res.status(404).json({
            success: false,
            message: "A selected product was not found."
          });
        }

        const quantity = Number(item.quantity);

        if (Array.isArray(product.sizes) && product.sizes.length > 0) {
          const validSizes = product.sizes.map(size =>
            typeof size === "object" ? size.name : size
          );

          if (!validSizes.includes(item.size)) {
            return res.status(400).json({
              success: false,
              message: "Invalid product size."
            });
          }
        }

        if (
          typeof product.stock === "number" &&
          product.stock < quantity
        ) {
          return res.status(400).json({
            success: false,
            message: `${product.name} is out of stock.`
          });
        }

        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid product price."
          });
        }

        verifiedItems.push({
          productId: product._id,
          name: product.name,
          price,
          size: String(item.size || ""),
          quantity,
          photo: product.photos?.[0] || ""
        });

        subtotal += price * quantity;
      }

      const order = {
        orderId: createOrderId(),
        customerName: String(customerName).trim(),
        customerPhone: phone,
        deliveryArea: String(deliveryArea),
        address: String(address).trim(),
        items: verifiedItems,
        subtotal,
        deliveryCharge,
        total: subtotal + deliveryCharge,
        paymentMethod: String(paymentMethod || ""),
        transactionId: String(transactionId || "").trim(),
        referralCode: String(referralCode || "").trim(),
        note: String(note || "").trim(),
        status: "Pending",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection("orders").insertOne(order);

      return res.status(201).json({
        success: true,
        message: "Order placed successfully.",
        orderId: order.orderId,
        total: order.total,
        status: order.status
      });
    }

    // ADMIN: Update order status
    if (req.method === "PATCH") {
      if (!isAdmin(req)) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const { orderId, status } = req.body || {};

      if (!orderId || !ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID or status."
        });
      }

      const result = await db.collection("orders").updateOne(
        { orderId },
        {
          $set: {
            status,
            updatedAt: new Date()
          }
        }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          success: false,
          message: "Order not found."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Order status updated."
      });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });

  } catch (error) {
    console.error("Orders API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  } finally {
    await client.close().catch(() => {});
  }
};
