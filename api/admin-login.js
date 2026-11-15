const jwt = require("jsonwebtoken");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const password = String(req.body?.password || "");
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) return res.status(500).json({ message: "Admin authentication is not configured" });
  if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ message: "Incorrect password" });
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  return res.status(200).json({ success: true, token });
};
