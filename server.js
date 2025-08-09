const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

// ==================
// Environment Secrets
// ==================
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN; // Render secret
const LOCATION_ID = process.env.LOCATION_ID;                 // Render secret
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;          // Google API key
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;          // Apify token (TikTok)

// Enable CORS for all origins
app.use(cors());

// ======================
// Square Orders Endpoints
// ======================

// 1. Current orders (OPEN + COMPLETED)
app.get("/orders", async (req, res) => {
  try {
    const response = await fetch("https://connect.squareup.com/v2/orders/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        location_ids: [LOCATION_ID],
        query: {
          filter: {
            state_filter: { states: ["OPEN", "COMPLETED"] }
          }
        }
      })
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    const data = await response.json();
    const count = data.orders ? data.orders.length : 0;
    res.json({ count });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. Total orders (all states)
app.get("/orders/total", async (req, res) => {
  try {
    const response = await fetch("https://connect.squareup.com/v2/orders/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ location_ids: [LOCATION_ID] })
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    const data = await response.json();
    const total = data.orders ? data.orders.length : 0;
    res.json({ total });
  } catch (err) {
    console.error("Error fetching total orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Most popular item (by sold quantity)
app.get("/orders/popular", async (req, res) => {
  try {
    const response = await fetch("https://connect.squareup.com/v2/orders/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        location_ids: [LOCATION_ID],
        query: {
          filter: { state_filter: { states: ["COMPLETED"] } }
        }
      })
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    const data = await response.json();
    const itemCounts = {};

    if (data.orders) {
      for (const order of data.orders) {
        if (order.line_items) {
          for (const item of order.line_items) {
            const name = item.name;
            const qty = parseInt(item.quantity) || 0;
            itemCounts[name] = (itemCounts[name] || 0) + qty;
          }
        }
      }
    }

    const popular = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0] || ["No Data", 0];
    res.json({ item: popular[0], sold: popular[1] });
  } catch (err) {
    console.error("Error fetching popular item:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ======================
// Social Media Endpoints
// ======================

// 4. TikTok followers by username (via Apify)
app.get("/social/tiktok/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/novi~tiktok-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles: [username] })
    });

    if (!apifyResponse.ok) {
      return res.status(apifyResponse.status).send(await apifyResponse.text());
    }

    const data = await apifyResponse.json();
    const followers = data[0]?.followers ?? 0;

    res.json({ username, followers });
  } catch (err) {
    console.error("Error fetching TikTok followers:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 5. YouTube subscribers by username
app.get("/social/youtube/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const ytResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forUsername=${encodeURIComponent(username)}&key=${YOUTUBE_API_KEY}`);
    if (!ytResponse.ok) {
      return res.status(ytResponse.status).send(await ytResponse.text());
    }

    const ytData = await ytResponse.json();
    const subscribers = ytData.items?.[0]?.statistics?.subscriberCount ?? 0;

    res.json({ username, subscribers });
  } catch (err) {
    console.error("Error fetching YouTube subscribers:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});
