const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
// const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_KEY = "sk-66807314afcf4c31b35465c35d066286";

app.use(cors());
app.use(express.json());

// API جديدة: /chat
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  // تحقق من النص
  if (!message || message.trim() === '' || message.length > 400) {
    return res.status(400).json({ error: 'الرسالة فارغة أو طويلة جدًا' });
  }

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.deepseek.com/v1/chat/completions',
      data: {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: message
          },
          {
            role: "system",
            content: "فسر الأحلام فقط وفق ابن سيرين باختصار لا يتجاوز 350 حرفًا بنص متكامل دون تعداد نقطي، واعتذر عن أي سؤال خارج تفسير الأحلام."
          }
        ],
        stream: true
      },
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      responseType: 'stream'
    });

    // إعداد headers للإرجاع بتقنية SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // تمرير الرد من DeepSeek مباشرة إلى العميل
    response.data.on('data', (chunk) => {
      res.write(chunk);
    });

    response.data.on('end', () => {
      res.end();
    });

    response.data.on('error', (err) => {
      console.error("Stream error:", err);
      res.end();
    });

  } catch (err) {
    console.error("Request failed:", err.response?.data || err.message);
    res.status(500).json({ error: 'فشل الاتصال بـ DeepSeek' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
