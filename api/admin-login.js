
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { password } = req.body || {};

    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPassword || !jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error"
      });
    }

    if (
      typeof password !== "string" ||
      password !== adminPassword
    ) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    const token = jwt.sign(
      { role: "admin" },
      jwtSecret,
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token
    });

  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
