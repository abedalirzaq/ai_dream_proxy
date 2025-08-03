const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// استخدم DEEPSEEK_API_KEY بدلاً من OPENAI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(express.json());

// إضافة middleware للتحقق من وجود API key
if (!DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY غير موجود في متغيرات البيئة');
  process.exit(1);
}

app.post('/gpt', async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    // التحقق من صحة البيانات المُرسلة
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'صيغة الرسائل غير صحيحة - يجب أن تكون مصفوفة غير فارغة' 
      });
    }

    // التحقق من طول الرسائل
    const totalLength = messages.map(m => (m.content || "")).join("").length;
    if (totalLength > 10000) { // زيادة الحد الأقصى إلى 10000 حرف
      return res.status(413).json({ 
        error: `الرسالة طويلة جداً (${totalLength}/10000 حرف)` 
      });
    }

    // إعداد البيانات المُرسلة إلى DeepSeek
    const requestData = {
      model: model || "deepseek-chat", // استخدام نموذج DeepSeek الافتراضي
      messages: messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('📤 إرسال طلب إلى DeepSeek API...');
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 ثانية timeout
      }
    );

    console.log('✅ تم استلام الرد من DeepSeek API');
    res.json(response.data);

  } catch (err) {
    console.error('❌ خطأ في DeepSeek API:');
    
    if (err.response) {
      // خطأ من الخادم (4xx, 5xx)
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
      
      const statusCode = err.response.status;
      let errorMessage = 'خطأ من DeepSeek API';
      
      switch (statusCode) {
        case 401:
          errorMessage = 'مفتاح API غير صحيح أو منتهي الصلاحية';
          break;
        case 403:
          errorMessage = 'ليس لديك صلاحية للوصول إلى هذا المورد';
          break;
        case 429:
          errorMessage = 'تجاوزت الحد المسموح من الطلبات، حاول مرة أخرى لاحقاً';
          break;
        case 500:
          errorMessage = 'خطأ داخلي في خادم DeepSeek';
          break;
        default:
          errorMessage = err.response.data?.error?.message || 'خطأ غير معروف من DeepSeek API';
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: err.response.data 
      });
      
    } else if (err.request) {
      // لم يتم استلام رد من الخادم
      console.error('No response received:', err.message);
      res.status(503).json({ 
        error: 'لا يمكن الوصول إلى DeepSeek API - تحقق من الاتصال بالإنترنت' 
      });
      
    } else {
      // خطأ في إعداد الطلب
      console.error('Request setup error:', err.message);
      res.status(500).json({ 
        error: 'خطأ في إعداد الطلب',
        details: err.message 
      });
    }
  }
});

// إضافة endpoint للتحقق من حالة الخادم
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(لب),
    apiKeyConfigured: !!DEEPSEEK_API_KEY 
  });
});

// إضافة endpoint للتحقق من صحة API key
app.get('/test-api', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    res.json({ 
      status: 'API key صحيح', 
      model: response.data.model 
    });
    
  } catch (err) {
    res.status(500).json({ 
      status: 'API key غير صحيح أو مشكلة في الاتصال',
      error: err.response?.data || err.message 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${port}`);
  console.log(`🔑 API Key: ${DEEPSEEK_API_KEY ? 'مُكون' : '❌ غير مُكون'}`);
  console.log(`📋 الـ endpoints المتاحة:`);
  console.log(`   POST /gpt - للتحدث مع DeepSeek`);
  console.log(`   GET /health - للتحقق من حالة الخادم`);
  console.log(`   GET /test-api - لاختبار API key`);
});