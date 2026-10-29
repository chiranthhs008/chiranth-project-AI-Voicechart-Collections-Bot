const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateResponse(userSpeech) {

  const prompt = `
You are a polite AI collections agent calling customers about overdue payments.

Rules:
- Be polite
- Ask when they can make payment
- Offer options if needed
- Keep responses short

Customer said: "${userSpeech}"
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional debt collection agent." },
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = generateResponse;