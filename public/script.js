// --- DOM 元素選取 ---
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const submitBtn = document.getElementById('submit-btn');
const imageUploadInput = document.getElementById('image-upload-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageFilename = document.getElementById('image-filename');
const removeImageBtn = document.getElementById('remove-image-btn');

// --- 後端 API 的網址 ---
// Netlify 會自動將這個路徑導向到我們的後端函式
const API_ENDPOINT = '/.netlify/functions/get-gemini-response';

// --- 狀態管理 ---
let chatHistory = [];
let uploadedImage = null;

// --- 事件監聽 ---
chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage && !uploadedImage) return;
    
    const userParts = [];
    if (userMessage) userParts.push({ text: userMessage });
    if (uploadedImage) {
        userParts.push({
            inlineData: {
                mimeType: uploadedImage.type,
                data: uploadedImage.data
            }
        });
    }

    addMessageToUI(userParts, 'user');
    chatHistory.push({ role: "user", parts: userParts });
    userInput.value = '';
    resetImageUpload();
    await getBotResponse();
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage = {
                data: event.target.result.split(',')[1],
                type: file.type
            };
            imagePreview.src = event.target.result;
            imageFilename.textContent = file.name;
            imagePreviewContainer.classList.remove('hidden');
            imagePreviewContainer.classList.add('flex');
        };
        reader.readAsDataURL(file);
    }
});

removeImageBtn.addEventListener('click', resetImageUpload);

function resetImageUpload() {
    uploadedImage = null;
    imageUploadInput.value = '';
    imagePreviewContainer.classList.add('hidden');
    imagePreviewContainer.classList.remove('flex');
}

async function getBotResponse() {
    submitBtn.disabled = true;
    const loadingBubble = addLoadingBubble();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: chatHistory }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API 請求失敗，狀態碼: ${response.status}`);
        }

        const data = await response.json();
        const botMessage = data.answer;
        addMessageToUI([{ text: botMessage }], 'bot');
        chatHistory.push({ role: "model", parts: [{ text: botMessage }] });

    } catch (error) {
        console.error('呼叫 API 時發生錯誤:', error);
        addMessageToUI([{ text: `抱歉，發生錯誤: ${error.message}` }], 'bot', true);
    } finally {
        loadingBubble.remove();
        submitBtn.disabled = false;
    }
}

function addLoadingBubble() {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'flex justify-start';
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-bubble flex items-center justify-center';
    const loader = document.createElement('div');
    loader.className = 'loader';
    bubble.appendChild(loader);
    messageWrapper.appendChild(bubble);
    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageWrapper;
}

function addMessageToUI(parts, sender, isError = false) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubble = document.createElement('div');
    
    if (isError && sender === 'bot') {
        bubble.className = 'chat-bubble bot-bubble error-bubble';
    } else {
        bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
    }
    
    parts.forEach(part => {
        if (part.text) {
            const messageContainer = document.createElement('div');
            messageContainer.innerHTML = marked.parse(part.text);
            bubble.appendChild(messageContainer);
        }
        if (part.inlineData && sender === 'user') {
            const imageElement = document.createElement('img');
            imageElement.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            imageElement.className = 'mt-2 rounded-lg max-w-xs';
            bubble.appendChild(imageElement);
        }
    });

    messageWrapper.appendChild(bubble);
    chatContainer.appendChild(messageWrapper);
    renderMathInElement(bubble, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
        ]
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
