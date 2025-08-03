const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors({
}));
app.use(express.json());

app.post('/gpt', async (req, res) => {
  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  const totalLength = messages.map(m => m.content || "").join("").length;
  if (totalLength > 1000) {
    return res.status(413).json({ error: 'Message too long' });
  }

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Error from GPT API' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
