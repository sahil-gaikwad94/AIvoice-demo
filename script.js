document.addEventListener('DOMContentLoaded', () => {
    // Hugging Face API configuration
    const HUGGINGFACE_API_KEY = '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'; 
    const HUGGINGFACE_MODEL = 'microsoft/DialoGPT-medium'; // Free conversational model
    
    // Airtable configuration (keep your existing credentials)
    const AIRTABLE_API_KEY = 'patSBnMpKEGWpEhC8.7d44c0acb8b592aa13f1335ad841a833c21e453a5e869bfe922d77b5f19d4badE';
    const AIRTABLE_BASE_ID = 'appI2S6LZBin7cjDB';
    const AIRTABLE_TABLE_NAME = 'Logs';

    const talkButton = document.getElementById('talk-button');
    const statusElement = document.getElementById('status');
    const transcriptContainer = document.getElementById('transcript-container');
    const speechBadge = document.getElementById('speech-badge');
    const aiBadge = document.getElementById('ai-badge');

    let isProcessing = false;
    let conversationHistory = []; // Store conversation context

    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        updateStatus('Speech recognition not supported in this browser.', 'error');
        talkButton.disabled = true;
        speechBadge.textContent = 'Speech Unavailable';
        speechBadge.className = 'badge badge-offline';
        return;
    }

    // Configure Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const updateStatus = (text, type = 'default') => {
        const indicator = statusElement.querySelector('.status-indicator');
        const textSpan = statusElement.childNodes[2] || statusElement;
        
        // Update text
        if (textSpan.nodeType === Node.TEXT_NODE) {
            textSpan.textContent = text;
        } else {
            statusElement.innerHTML = `<span class="status-indicator"></span>${text}`;
        }
        
        // Update classes for animation
        statusElement.className = `status-text ${type}`;
    };

    const addMessageToTranscript = (sender, message, type = 'normal') => {
        const messageElement = document.createElement('div');
        const senderClass = sender === 'You' ? 'transcript-user' : 
                          sender === 'System' ? 'transcript-system' : 'transcript-ai';
        
        messageElement.classList.add('message', senderClass);
        
        if (sender !== 'System') {
            const avatar = sender === 'You' ? 'U' : 'AI';
            messageElement.innerHTML = `
                <div class="message-header">
                    <div class="message-avatar">${avatar}</div>
                    ${sender}
                </div>
                ${message}
            `;
        } else {
            messageElement.innerHTML = message;
        }
        
        transcriptContainer.appendChild(messageElement);
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    };

    const toggleProcessing = (state) => {
        isProcessing = state;
        talkButton.disabled = state;
        const buttonText = talkButton.querySelector('.button-text');
        
        if (state) {
            buttonText.textContent = 'Processing';
            talkButton.classList.add('processing');
        } else {
            buttonText.textContent = 'Talk';
            talkButton.classList.remove('processing', 'listening');
            updateStatus('Click the button and start speaking');
        }
    };

    // Button click handler
    talkButton.addEventListener('click', () => {
        if (isProcessing) return;
        recognition.start();
    });

    // Speech Recognition Event Handlers
    recognition.onstart = () => {
        updateStatus('Listening... Speak now', 'listening');
        talkButton.disabled = true;
        talkButton.classList.add('listening');
        const buttonText = talkButton.querySelector('.button-text');
        buttonText.textContent = 'Listening';
    };

    recognition.onresult = async (event) => {
        const userInput = event.results[0][0].transcript;
        addMessageToTranscript('You', userInput);
        toggleProcessing(true);
        updateStatus('AI is thinking...', 'processing');

        try {
            const aiResponse = await getHuggingFaceResponse(userInput);
            updateStatus('Speaking response...', 'processing');
            speak(aiResponse, () => {
                logToAirtable(userInput, aiResponse);
                toggleProcessing(false);
            });
            addMessageToTranscript('AI', aiResponse);
        } catch (error) {
            console.error('Error getting AI response:', error);
            updateStatus(`Error: ${error.message}`, 'error');
            addMessageToTranscript('System', `⚠️ Sorry, I couldn't get a response. ${error.message}`);
            toggleProcessing(false);
        }
    };

    recognition.onerror = (event) => {
        let errorMessage = `Speech recognition error: ${event.error}`;
        if (event.error === 'not-allowed') {
            errorMessage = 'Microphone access denied. Please allow microphone permissions.';
        } else if (event.error === 'no-speech') {
            errorMessage = 'No speech detected. Please try again.';
        }
        updateStatus(errorMessage, 'error');
        addMessageToTranscript('System', `🎤 ${errorMessage}`);
        toggleProcessing(false);
    };

    recognition.onend = () => {
        if (!isProcessing) {
            toggleProcessing(false);
        }
    };

    // Hugging Face API function
    const getHuggingFaceResponse = async (text) => {
        if (HUGGINGFACE_API_KEY === 'hf_your_api_key_here') {
            // Fallback to a free model without API key (limited requests)
            return await getHuggingFaceFreeResponse(text);
        }

        const url = `https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`;
        
        // Add user input to conversation history
        conversationHistory.push(text);
        
        // Keep only last 6 exchanges to manage context length
        if (conversationHistory.length > 6) {
            conversationHistory = conversationHistory.slice(-6);
        }

        const requestBody = {
            inputs: {
                past_user_inputs: conversationHistory.slice(0, -1),
                generated_responses: [],
                text: text
            },
            parameters: {
                max_length: 100,
                temperature: 0.7,
                do_sample: true,
                top_p: 0.9
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error('Model is loading. Please try again in a moment.');
                }
                const errorData = await response.json();
                aiBadge.textContent = 'AI Error';
                aiBadge.className = 'badge badge-offline';
                throw new Error(`Hugging Face API Error: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            if (data.generated_text) {
                return data.generated_text.trim();
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error('Invalid response structure from Hugging Face API.');
            }
        } catch (error) {
            console.error('Hugging Face API Error:', error);
            // Fallback to free API if paid API fails
            return await getHuggingFaceFreeResponse(text);
        }
    };

    // Free Hugging Face API function (no API key required, but limited)
    const getHuggingFaceFreeResponse = async (text) => {
        const models = [
            'microsoft/DialoGPT-small',
            'facebook/blenderbot-400M-distill',
            'microsoft/DialoGPT-medium'
        ];
        
        for (const model of models) {
            try {
                const url = `https://api-inference.huggingface.co/models/${model}`;
                const requestBody = {
                    inputs: text,
                    parameters: {
                        max_length: 80,
                        temperature: 0.8,
                        do_sample: true
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (Array.isArray(data) && data[0]?.generated_text) {
                        let responseText = data[0].generated_text;
                        // Clean up the response (remove the input text if it's repeated)
                        if (responseText.startsWith(text)) {
                            responseText = responseText.substring(text.length).trim();
                        }
                        // If response is too short or empty, try next model
                        if (responseText.length < 5) {
                            continue;
                        }
                        return responseText || "I understand what you're saying. Could you tell me more?";
                    }
                }
            } catch (error) {
                console.warn(`Model ${model} failed:`, error);
                continue;
            }
        }
        
        // Ultimate fallback response
        const fallbackResponses = [
            "That's interesting! Can you tell me more about that?",
            "I see what you mean. What would you like to know?",
            "That's a good point. How can I help you with that?",
            "I understand. What else would you like to discuss?",
            "Thanks for sharing that. What's on your mind?"
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    };
    
    const speak = (text, onEndCallback) => {
        if (!window.speechSynthesis) {
            updateStatus('Speech synthesis not supported.', 'error');
            if(onEndCallback) onEndCallback();
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onend = () => {
            if(onEndCallback) onEndCallback();
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            updateStatus('Sorry, I couldn\'t speak the response.', 'error');
            if(onEndCallback) onEndCallback();
        };
        
        speechSynthesis.speak(utterance);
    };

    const logToAirtable = async (userInput, aiResponse) => {
        if (AIRTABLE_API_KEY === 'PASTE_YOUR_AIRTABLE_API_KEY_HERE' || AIRTABLE_BASE_ID === 'PASTE_YOUR_AIRTABLE_BASE_ID_HERE') {
            console.warn('Airtable credentials not configured. Skipping log.');
            return;
        }
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        const requestBody = {
            records: [{
                fields: {
                    UserInput: userInput,
                    AIResponse: aiResponse,
                    Timestamp: new Date().toISOString(),
                    Model: 'Hugging Face'
                },
            }],
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Airtable API Error: ${errorData.error.message || response.statusText}`);
            }
            console.log('Successfully logged to Airtable.');
        } catch (error) {
            console.error('Error logging to Airtable:', error);
            addMessageToTranscript('System', '📝 Failed to log conversation.');
        }
    };

    // Test Hugging Face API connection on load
    setTimeout(async () => {
        try {
            await getHuggingFaceResponse("Hello");
            aiBadge.textContent = 'AI Connected';
            aiBadge.className = 'badge badge-online';
        } catch (error) {
            console.warn('AI connection test failed:', error);
            aiBadge.textContent = 'AI Limited';
            aiBadge.className = 'badge badge-offline';
        }
    }, 1000);
});