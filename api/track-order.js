
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        success: false,
        message: "Method not allowed."
      });
    }

    const { orderId, phone } = req.body || {};

    if (!orderId || !phone) {
      return res.status(400).json({
        success: false,
        message: "Order ID and phone number are required."
      });
    }

    await client.connect();

    const db = client.db("24clothes");

    const normalizePhone = value =>
      String(value).replace(/\D/g, "");

    const order = await db.collection("orders").findOne({
      orderId: String(orderId).trim().toUpperCase(),
      customerPhone: normalizePhone(phone)
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found. Please check your Order ID and phone number."
      });
    }

    return res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        items: order.items.map(item => ({
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error("Tracking API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  } finally {
    await client.close().catch(() => {});
  }
};
