const jwt = require("jsonwebtoken");
function requireAdmin(req, res) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ") || !process.env.JWT_SECRET) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error("Forbidden");
    return true;
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
}
module.exports = { requireAdmin };
