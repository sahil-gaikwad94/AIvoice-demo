# Voice AI Demo

This is a simple, self-contained web application that demonstrates a voice-to-voice interaction with Google's Gemini AI. The conversation is then logged to an Airtable base for record-keeping. This project was built to be easily set up and deployed.

## Features

-   **Voice Input**: Uses the browser's Web Speech API to capture your voice.
-   **AI Response**: Sends the transcribed text to Google's Gemini Pro model to generate a conversational response.
-   **Voice Output**: Uses the Web Speech API to speak the AI's response back to you.
-   **Conversation Logging**: Logs the user's query and the AI's response to a designated Airtable base.
-   **Zero Dependencies**: Runs directly in the browser with vanilla HTML, CSS, and JavaScript. No installation or build process needed.

## How to Set Up and Run

Follow these steps to get your own copy of the Voice AI Demo running.

### Step 1: Get the Project Files

Download the three project files (`index.html`, `style.css`, `script.js`) and place them in the same folder on your computer.

### Step 2: Obtain API Keys and Configuration Details

You will need credentials for both Google Gemini and Airtable.

#### A. Google Gemini API Key

1.  Go to **Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
2.  Sign in with your Google account.
3.  Click on the **"Get API key"** button on the left menu.
4.  Click **"Create API key in new project"**.
5.  A new API key will be generated for you. Copy this key and save it somewhere safe.

#### B. Airtable Configuration

1.  **Create an Airtable Account**: If you don't have one, sign up at [https://www.airtable.com/](https://www.airtable.com/).
2.  **Create a Base**: From your Airtable workspace, click **"Create a base"** and choose to start from scratch. You can name it something like "AI Demo Logs".
3.  **Create a Table**: By default, you'll have a table named "Table 1". You can rename it to "Conversations" or any name you prefer. **Remember this name.**
4.  **Set Up Fields**: Delete the default fields (`Notes`, `Attachments`, `Status`). Create two new fields:
    -   Field 1:
        -   **Field Name**: `UserInput` (case-sensitive)
        -   **Field Type**: "Single line text"
    -   Field 2:
        -   **Field Name**: `AIResponse` (case-sensitive)
        -   **Field Type**: "Single line text"
    Your table should now have just two columns: `UserInput` and `AIResponse`.
5.  **Get Your Airtable API Key**:
    -   Go to your Airtable account page: [https://airtable.com/account](https://airtable.com/account).
    -   In the API section, click the button to generate an API key if you don't already have one. Copy this key.
6.  **Get Your Base ID**:
    -   Go to the API documentation page for your new base by visiting [https://airtable.com/api](https://airtable.com/api) and selecting the base you just created.
    -   Your Base ID is a string that starts with `app...`. It's clearly visible in the introduction section of the API documentation. Copy this ID.

### Step 3: Configure the Application

Now you will add your keys and IDs to the project's code.

1.  Open the `script.js` file in a text editor.
2.  At the very top of the file, you will find the following configuration constants:

    ```javascript
    const GEMINI_API_KEY = 'PASTE_YOUR_GEMINI_API_KEY_HERE';
    const AIRTABLE_API_KEY = 'PASTE_YOUR_AIRTABLE_API_KEY_HERE';
    const AIRTABLE_BASE_ID = 'PASTE_YOUR_AIRTABLE_BASE_ID_HERE';
    const AIRTABLE_TABLE_NAME = 'PASTE_YOUR_TABLE_NAME_HERE';
