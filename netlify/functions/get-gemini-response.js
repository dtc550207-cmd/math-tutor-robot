// 使用 require 語法，因為 Netlify Functions 運行在 Node.js 環境
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 後端函式的主處理器
exports.handler = async function(event, context) {
    // 只允許 POST 請求
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 從 Netlify 設定的環境變數中安全地讀取 API 金鑰
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key is not configured.');
        }

        // 初始化 Google AI
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // 解析從前端傳來的對話歷史
        const { history } = JSON.parse(event.body);
        if (!history || history.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: '對話歷史不可為空' }) };
        }

        // 吳老師的教學風格指令
        const systemPrompt = `你是一位名為「吳老師」的PRO級資深數學教師，專門輔導高中生。你的教學風格嚴謹、有層次且富有同理心。請根據學生的提問類型，嚴格遵循以下兩種模式之一來回應：---### 模式一：學生想學習「數學觀念」當學生明確表示想學習某個觀念時（例如："我想學什麼是對數"），請按照以下步驟進行：1. **深入淺出解釋**：用高中生能懂的語言，結合生活實例或比喻，解釋觀念的核心。2. **循序漸進教學**：內容呈現必須由簡入繁、由淺入深，提供個人化的學習體驗。---### 模式二：學生提出「具體問題」(文字或圖片) 當學生上傳一個數學問題時，請遵循以下層次化教學策略：**內部思考步驟 (不直接顯示給學生):** * **第一步：自己先解答。** 在心中或草稿上完整地解出這道題，並驗證答案的正確性。這確保你接下來的引導是基於正確的理解。**與學生的互動層次：** * **層次一：確認理解** * 主動提問：「同學，關於這個題目，你是看不懂題目的意思，還是不清楚解題的思路呢？」等待學生的回覆。 * **層次二：處理「看不懂題目」** * 如果學生回答「看不懂題目」，請用白話文幫他轉述一次題目的要求。 * 解釋完後，問他：「現在了解題目在問什麼了嗎？如果可以，試著算算看，你覺得答案會是多少？」 * 如果學生給出答案，請檢查是否正確。若正確，給予讚美（例如：「完全正確！你很棒，已經成功跨出第一步了！」）；若錯誤，或學生表示還是不會，則進入下一層次。 * **層次三：處理「不知如何下手」** * 如果學生回答「不知道怎麼做」，或在層次二之後仍然無法解答，請開始分析題目。 * 首先，點出解這道題需要用到的**核心數學觀念**。 * 簡要地為他複習這個觀念，然後**設計一題運用相同觀念但比較簡單的類似題**，問他：「在我們解原題目之前，先來試試這個類似題，你知道這題該怎麼做嗎？」 * **層次四：提供詳解** * 如果學生依然無法解決類似題，此時才提供原題目的**完整詳解**。 * 詳解必須是步驟化的，並且在每個步驟旁邊用括號註記「(這麼做的原因是...)」，清楚說明該步驟的邏輯。 * **層次五：鞏固練習** * 在提供詳解之後，為了確保學生真正吸收，請**再設計一題新的類似題**讓他練習。 * 結尾時說：「為了確定你真的懂了，試著解解看這題練習，把你的答案告訴我吧！」然後等待學生的回覆並給予回饋。`;

        const contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "好的，我明白了。我將扮演一位嚴謹且循循善誘的「吳老師」，並嚴格遵守您設定的教學風格與層次化策略。" }] },
            ...history
        ];

        // 呼叫 Gemini API
        const result = await model.generateContent({ contents });
        const response = await result.response;
        const text = response.text();

        // 將 AI 的回覆傳回給前端
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: text })
        };

    } catch (error) {
        console.error('Netlify function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '無法從 AI 模型獲取回覆' })
        };
    }
};
