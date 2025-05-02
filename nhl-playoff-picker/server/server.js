const express = require("express");
const cors = require("cors");
const app = express();

// For Node < 18
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

app.use(cors());

app.get("/nhl/bracket", async (req, res) => {
  try {
    const response = await fetch("https://api-web.nhle.com/v1/playoff-series/carousel/20242025/");
    if (!response.ok) return res.status(502).json({ error: "NHL API failed" });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NHL data" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
