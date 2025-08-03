const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const PROXY_API_KEY = process.env.PROXY_API_KEY; // مفتاح الحماية الخاص بالـ proxy

// قائمة الدومينات المسموح بها (غيرها للدومين الخاص بتطبيقك)
const allowedOrigins = [
];

// إعداد CORS مع تحديد Origins مسموحة
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // السماح للطلبات بدون origin (مثلاً من Postman)
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'تم رفض الوصول بسبب سياسة CORS';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// إعداد rate limiter: أقصى 100 طلب لكل 15 دقيقة من نفس IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى للطلبات في الفترة
  message: { error: 'تم تجاوز الحد الأقصى للطلبات، حاول لاحقاً' },
});

app.use(limiter);

// تحقق من وجود server_key في الهيدر لكل طلب POST على /chat
app.use('/chat', (req, res, next) => {
  const apiKey = req.headers['server_key'];
  if (!apiKey || apiKey !== PROXY_API_KEY) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  next();
});

// API /chat مع البث streaming
app.post('/chat', async (req, res) => {
  const { message } = req.body;

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
          { role: "user", content: message },
          { role: "system", content: "فسر الأحلام فقط وفق ابن سيرين باختصار لا يتجاوز 350 حرفًا بنص متكامل دون تعداد نقطي، واعتذر عن أي سؤال خارج تفسير الأحلام." }
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

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    response.data.on('data', chunk => res.write(chunk));
    response.data.on('end', () => res.end());
    response.data.on('error', err => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (err) {
    console.error('Request failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'فشل الاتصال بـ DeepSeek' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
