# 🚀 Chrome Extension: Gmail Rewrite Assistant with Gemini Nano

This Chrome extension injects an AI-powered assistant directly into Gmail’s email composer, allowing users to instantly rewrite their messages in different tones (Formal, Friendly) and lengths (Shorten) using the native **Rewriter API** powered by **Gemini Nano**.

---

## 💻 Key Technologies and Core Concepts

This project uses pure web technologies ("Vanilla JS") and experimental Chrome APIs.

| Technology | Role in the Project |
|-------------|--------------------|
| **JavaScript (Vanilla JS)** | Core logic of the extension: script injection, event handling, and API communication. |
| **HTML/CSS** | Defines the structure and styling of the injected buttons and context modal. |
| **Rewriter API (Gemini Nano)** | The actual AI performing the rewriting. This is an experimental Chrome API (Origin Trial). |
| **MutationObserver** | The “watchdog” that monitors Gmail’s dynamic DOM to detect when a compose window is opened. |
| **Chrome Extension API** | Defines permissions, handles script injection into Gmail, and manages the extension’s structure. |
| **Asynchrony (async/await / for await)** | Handles streaming text responses from the AI smoothly. |

---

## 🛠️ Project Structure

Your project folder should contain at least the following files:

/your-project
├── manifest.json
├── content.js <-- All your JS logic (UI + injection)
└── styles.css <-- Styles for buttons and modal

pgsql
Copiar código

---

## ⚙️ manifest.json Configuration

This file is the “ID card” of your extension — it defines the required permissions and where the scripts should run.

### Example (Manifest V3 – Recommended)

```json
{
  "manifest_version": 3,
  "name": "Gmail Rewrite Assistant",
  "version": "1.0",
  "description": "Rewrite Gmail emails using Gemini Nano.",
  "icons": {
    "48": "icon48.png"
  },
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ],
  "host_permissions": [
    "https://mail.google.com/"
  ]
}

```
Key Points:

manifest_version: 3: Current and required manifest version.

content_scripts: Injects content.js and styles.css automatically when visiting Gmail.

host_permissions: Explicitly allows the extension to access Gmail’s domain.

🧩 Extension Logic (content.js & Flow)
1. Origin Trial Token Injection
injectOriginTrialToken() inserts a <meta http-equiv="origin-trial"> tag into Gmail’s <head>.
This is required to use the experimental Rewriter API.

2. API Availability Check
initializeAI() verifies if the Rewriter object exists and whether the Gemini Nano model is available or downloadable.

3. Interface Observation (SPA Handling)
initAssistantUI() sets up a MutationObserver on the document.body.
When the user clicks Compose, Gmail dynamically adds the editor — triggering the observer.

4. UI Injection
When triggered, the observer searches for Gmail’s editor toolbar (.aDh or div[role="dialog"]).
It calls createButtonsForCompose() to inject the AI panel (buttons like Formalize, Shorten, Friendly, and Context).

5. Context Handling (Modal)
Clicking 📝 Context calls showContextModal(), which displays a floating <textarea> with Save and Cancel.
The saved text is stored in the editor’s data-ai-context attribute.
The updateContextButtonAppearance utility visually marks the button when context text is active.

6. AI Call (Streaming Rewrite)
When clicking Formalize, Shorten, or Friendly:

The user’s selected text (or entire body) is read.

The stored data-ai-context is appended.

A Rewriter instance is created with parameters for tone and length.

Using for await (const chunk of tempRewriter.rewriteStreaming(originalText)), rewritten text is streamed into the Gmail editor in real time — creating a dynamic typing effect.

✨ Installation & Usage in Chrome
1. Prepare Files
Ensure your folder contains:
manifest.json, content.js, styles.css, and an optional icon.png.

2. Load the Extension
Open Google Chrome.

Go to chrome://extensions.

Enable Developer Mode (top-right corner).

Click Load unpacked.

Select your project folder.

3. Use the Extension
Open Gmail.

Click Compose to open a new message.

You should see the new AI buttons (Formalize, Shorten, Friendly, Context) in the toolbar.

Try 📝 Context → add a prompt like “Make it sound polite and concise” → click Save.

Write something and click one of the tone buttons — your text will be rewritten live in streaming mode.

🧠 Summary
This Chrome Extension demonstrates:

Integration with experimental Chrome AI APIs (Gemini Nano)

Real-time text streaming using for await

Dynamic UI injection in a SPA (Gmail)

Lightweight, dependency-free logic using pure JavaScript

📜 License
MIT License © 2025
Developed for educational and experimental purposes using Gemini Nano Origin Trials.
