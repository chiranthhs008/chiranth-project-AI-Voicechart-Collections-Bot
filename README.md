# 🤖 Voice Collections Bot

An AI-powered voice collections agent that makes automated outbound calls to customers with overdue payments. Built with **Twilio**, **OpenAI GPT-4o-mini**, and **Express.js**, with a React dashboard for monitoring call statuses.

---

## 📋 Overview

The Voice Collections Bot places phone calls to customers and holds a natural, two-way voice conversation to collect overdue payments. The bot:

1. **Greets** the customer and reminds them of their overdue payment.
2. **Listens** to their spoken response via Twilio's speech recognition.
3. **Generates** a polite, context-aware reply using OpenAI's GPT-4o-mini.
4. **Continues** the conversation in a loop until the call ends.

---

## 🏛️ Architecture & System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌────────────────────┐          ┌─────────────────────────────┐   │
│   │   Customer's Phone │          │   React Dashboard (Browser) │   │
│   │   (PSTN Network)   │          │   frontend/App.jsx          │   │
│   └────────┬───────────┘          └────────────────────────────-┘   │
└────────────│────────────────────────────────────────────────────────┘
             │ Voice Call (PSTN)
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       TWILIO CLOUD LAYER                            │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Twilio Voice API                                            │  │
│   │  • Manages phone call lifecycle                              │  │
│   │  • Speech-to-Text (STT) via <Gather> TwiML                  │  │
│   │  • Text-to-Speech (TTS) via <Say> TwiML                     │  │
│   └──────────────────────┬───────────────────────────────────────┘  │
└──────────────────────────│──────────────────────────────────────────┘
                           │ POST /voice  (TwiML Webhook)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER  (Node.js / Express)            │
│                                                                     │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │   server.js      │───▶│ twilioWebhook.js │                      │
│   │  Express on :3000│    │  Webhook handler │                      │
│   └──────────────────┘    └────────┬─────────┘                      │
│                                    │                                │
│                                    ▼                                │
│                           ┌──────────────────┐                      │
│                           │   botLogic.js    │                      │
│                           │  OpenAI Client   │                      │
│                           └────────┬─────────┘                      │
└────────────────────────────────────│────────────────────────────────┘
                                     │ HTTPS API Call
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       OPENAI CLOUD LAYER                            │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  GPT-4o-mini                                                 │  │
│   │  • Receives customer speech as text prompt                   │  │
│   │  • Returns short, context-aware collection response          │  │
│   └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Component Responsibilities

| Component | File | Responsibility |
|---|---|---|
| **HTTP Server** | `backend/server.js` | Bootstraps Express, registers middleware, mounts the `/voice` route |
| **Webhook Handler** | `backend/twilioWebhook.js` | Parses Twilio POST data, builds TwiML responses, drives conversation loop |
| **AI Engine** | `backend/botLogic.js` | Wraps OpenAI SDK, crafts the system prompt, calls GPT-4o-mini, returns text |
| **Dashboard UI** | `frontend/App.jsx` | React component showing customer call outcomes |

---

### Request / Response Data Flow

```
1. Twilio initiates call to customer
         │
         ▼
2. POST /voice  {SpeechResult: ""}        ← First hit (no speech yet)
         │
         ▼
3. twilioWebhook.js detects empty speech
         │
         ▼
4. Returns TwiML:
      <Say>  "Hello, your payment is overdue..."  </Say>
      <Gather input="speech" action="/voice">     ← listens for reply
         │
         ▼
5. Customer speaks → Twilio STT transcribes it
         │
         ▼
6. POST /voice  {SpeechResult: "I can pay next Friday"}
         │
         ▼
7. twilioWebhook.js → botLogic.js → OpenAI API
         │
         ▼
8. GPT-4o-mini returns: "That works! We'll note next Friday..."
         │
         ▼
9. Returns TwiML:
      <Say>  AI reply  </Say>
      <Gather input="speech" action="/voice">     ← loop continues
```

---

### Conversation State Machine

```
         ┌─────────────┐
         │  CALL START  │
         └──────┬───────┘
                │
                ▼
     ┌──────────────────────┐
     │  GREETING STATE       │
     │  SpeechResult == ""   │
     │  → Play opening msg   │
     │  → Gather speech      │
     └──────────┬────────────┘
                │  Customer speaks
                ▼
     ┌──────────────────────┐
     │   AI RESPONSE STATE   │◀─────────────┐
     │  SpeechResult != ""   │              │
     │  → Call OpenAI        │              │
     │  → Play AI reply      │              │
     │  → Gather next speech │──────────────┘
     └──────────┬────────────┘  Customer speaks again
                │  Customer hangs up / silence timeout
                ▼
         ┌─────────────┐
         │  CALL END    │
         └─────────────┘
```

---

### Design Decisions

| Decision | Rationale |
|---|---|
| **Stateless webhook handler** | Each POST to `/voice` is self-contained. Twilio provides speech in the request body, so no server-side session storage is needed for the conversation. |
| **GPT-4o-mini over GPT-4** | Lower latency and cost per call — critical for real-time voice where response delays degrade the user experience. |
| **TwiML `<Gather>` loop** | Using `action="/voice"` on every `<Gather>` creates a self-referencing loop, keeping the conversation alive without any WebSocket or long-polling infrastructure. |
| **`speechTimeout: "auto"`** | Lets Twilio dynamically detect end-of-speech instead of cutting off the customer after a fixed timer. |
| **Express v5** | Async/await error propagation is handled natively, simplifying the async OpenAI call inside the webhook handler. |

---

### Sequence Diagram

```
Customer      Twilio        Express Server     OpenAI
   │             │                │               │
   │──(call)────▶│                │               │
   │             │──POST /voice──▶│               │
   │             │                │               │
   │             │◀──TwiML(greet)─│               │
   │◀──(speech)──│                │               │
   │──(speaks)──▶│                │               │
   │             │──POST /voice──▶│               │
   │             │    +SpeechResult│──(prompt)────▶│
   │             │                │◀──(reply text)─│
   │             │◀──TwiML(reply)─│               │
   │◀──(speech)──│                │               │
   │    [loop continues...]       │               │
```

---

## 🏗️ Project Structure

```
Voice Collections Bot/
├── backend/
│   ├── server.js          # Express server — listens on port 3000
│   ├── twilioWebhook.js   # Handles Twilio voice webhook & TwiML responses
│   ├── botLogic.js        # OpenAI GPT-4o-mini integration
│   └── .env               # Environment variables (never commit this!)
├── frontend/
│   ├── App.jsx            # React dashboard UI
│   └── Dashboard.jsx      # Call status dashboard component
└── package.json
```

---

## 🛠️ Tech Stack

| Layer     | Technology                     |
|-----------|-------------------------------|
| Backend   | Node.js, Express.js v5        |
| AI        | OpenAI GPT-4o-mini            |
| Voice     | Twilio Voice API + TwiML      |
| Frontend  | React (JSX)                   |
| Config    | dotenv                        |

---

## ⚙️ Prerequisites

- **Node.js** v18+
- A **Twilio** account with a phone number capable of making outbound calls
- An **OpenAI** API key
- A public-facing URL for Twilio webhooks (use [ngrok](https://ngrok.com/) for local development)

---

## 🚀 Setup & Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd voice-collections-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

> ⚠️ **Never commit your `.env` file.** Add it to `.gitignore`.

### 4. Start the backend server

```bash
node backend/server.js
```

The server will start on **http://localhost:3000**.

### 5. Expose your local server with ngrok

Twilio needs a publicly accessible URL to send webhook events:

```bash
ngrok http 3000
```

Copy the generated HTTPS URL (e.g., `https://abc123.ngrok.io`).

### 6. Configure Twilio webhook

In your [Twilio Console](https://console.twilio.com/):

1. Go to **Phone Numbers → Manage → Active Numbers**.
2. Select your Twilio phone number.
3. Under **Voice Configuration → A Call Comes In**, set the webhook URL to:
   ```
   https://<your-ngrok-url>/voice
   ```
4. Set the HTTP method to **POST**.

---

## 📞 How It Works

```
Incoming/Outbound Call
        │
        ▼
  [Twilio Voice API]
        │
        ▼
  POST /voice (twilioWebhook.js)
        │
        ├─ No speech yet? → Greet customer & gather speech input
        │
        └─ Speech received? → Send to OpenAI (botLogic.js)
                                      │
                                      ▼
                              GPT-4o-mini generates reply
                                      │
                                      ▼
                           Twilio speaks reply → gather next input
```

---

## 🖥️ Frontend Dashboard

The React frontend (`frontend/App.jsx`) provides a simple dashboard showing call records and their statuses:

| Customer | Status           |
|----------|-----------------|
| John     | Promise to Pay   |
| Alice    | Call Back Later  |
| David    | Paid             |

> **Note:** The frontend is currently a standalone React component. To run it, set up a React environment (e.g., Vite or Create React App) in the `frontend/` directory.

---

## 🔐 Security Notes

- **Never expose your `.env` file** in version control. Add `backend/.env` to your `.gitignore`.
- Rotate your API keys immediately if they are ever committed or leaked.
- Validate incoming Twilio webhook requests using [Twilio Request Validation](https://www.twilio.com/docs/usage/security) in production.

---

## 📦 Dependencies

```json
{
  "axios": "^1.13.6",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "openai": "^6.29.0",
  "twilio": "^5.13.0"
}
```

---

## 🗺️ Future Improvements

- [ ] Connect frontend dashboard to live call data via REST API or WebSocket
- [ ] Add call logging to a database (e.g., PostgreSQL, MongoDB)
- [ ] Add Twilio request signature validation for webhook security
- [ ] Support outbound call initiation from the dashboard
- [ ] Add multi-language support for international collections
- [ ] Implement call outcome tracking (paid, promised, failed)

---

## 📄 License

ISC
