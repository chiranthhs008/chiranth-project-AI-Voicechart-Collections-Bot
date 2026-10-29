const VoiceResponse = require("twilio").twiml.VoiceResponse;
const generateResponse = require("./botLogic");

async function twilioWebhook(req, res) {

  const twiml = new VoiceResponse();

  const userSpeech = req.body.SpeechResult || "";

  if (!userSpeech) {

    twiml.say(
      "Hello, this is an automated payment reminder system. Your payment is overdue. When can you make the payment?"
    );

    twiml.gather({
      input: "speech",
      action: "/voice",
      method: "POST",
      speechTimeout: "auto"
    });

  } else {

    const aiReply = await generateResponse(userSpeech);

    twiml.say(aiReply);

    twiml.gather({
      input: "speech",
      action: "/voice",
      method: "POST",
      speechTimeout: "auto"
    });

  }

  res.type("text/xml");
  res.send(twiml.toString());
}

module.exports = twilioWebhook;