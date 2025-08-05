// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN; // Set in Render secrets
const LOCATION_ID = process.env.LOCATION_ID;                 // Set in Render secrets

app.use(cors()); // Enable CORS for all origins

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
              states: ["OPEN", "COMPLETED"] // track open & completed orders
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
