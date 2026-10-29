require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const twilioWebhook = require("./twilioWebhook");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/voice", twilioWebhook);

app.listen(3000, () => {
  console.log("Voice Collections Bot running on port 3000");
});