const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // npm install node-fetch@2
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Env variables
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID; // Your channel ID
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; // Default username

app.use(cors());

// -----------------------
// Orders count
// -----------------------
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
            state_filter: {
              states: ["OPEN", "COMPLETED"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(`Square API error: ${errorData}`);
    }

    const data = await response.json();
    const orderCount = data.orders ? data.orders.length : 0;
    res.json({ count: orderCount });
  } catch (error) {
    console.error("Error fetching Square orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -----------------------
// Orders total amount
// -----------------------
app.get("/orders/total", async (req, res) => {
  try {
    const response = await fetch("https://connect.squareup.com/v2/orders/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        location_ids: [LOCATION_ID],
        query: {}
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(`Square API error: ${errorData}`);
    }

    const data = await response.json();
    let totalAmount = 0;

    if (data.orders) {
      data.orders.forEach(order => {
        if (order.total_money) {
          totalAmount += order.total_money.amount;
        }
      });
    }

    res.json({ total: totalAmount / 100 }); // convert cents to dollars
  } catch (error) {
    console.error("Error fetching total orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -----------------------
// Most popular item
// -----------------------
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
        query: {}
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(`Square API error: ${errorData}`);
    }

    const data = await response.json();
    const itemCounts = {};

    if (data.orders) {
      data.orders.forEach(order => {
        if (order.line_items) {
          order.line_items.forEach(item => {
            const name = item.name;
            const qty = parseInt(item.quantity, 10) || 0;
            itemCounts[name] = (itemCounts[name] || 0) + qty;
          });
        }
      });
    }

    let popularItem = null;
    let maxCount = 0;
    for (const [item, count] of Object.entries(itemCounts)) {
      if (count > maxCount) {
        popularItem = item;
        maxCount = count;
      }
    }

    res.json({ item: popularItem, count: maxCount });
  } catch (error) {
    console.error("Error fetching popular item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -----------------------
// TikTok followers (Apify)
// -----------------------
app.get("/social/tiktok", async (req, res) => {
  try {
    const username = TIKTOK_USERNAME;
    const actorUrl = `https://api.apify.com/v2/acts/novi~tiktok-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;
    
    const response = await fetch(actorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username] })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(`Apify error: ${errorData}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      res.json({ username, followers: data[0].followers });
    } else {
      res.status(404).json({ error: "No TikTok data found" });
    }
  } catch (error) {
    console.error("Error fetching TikTok followers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -----------------------
// YouTube subscribers
// -----------------------
app.get("/social/youtube", async (req, res) => {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).send(`YouTube API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      res.json({ subscribers: data.items[0].statistics.subscriberCount });
    } else {
      res.status(404).json({ error: "No YouTube channel found" });
    }
  } catch (error) {
    console.error("Error fetching YouTube subscribers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
