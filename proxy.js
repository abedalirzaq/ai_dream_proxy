const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(express.json());

app.post('/proxy', async (req, res) => {
  try {
    const { url, body } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    const isStream = body?.stream === true;

    if (isStream) {
      const response = await axios({
        method: 'post',
        url: url,
        data: body,
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream'
      });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      response.data.pipe(res);
    } else {
      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      res.json(response.data);
    }
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ error: 'Request failed' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});