const express = require("express")
const express = require("express");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/"c(path.join(__dirname,"index.htlm));

const PORT = process.env.PORT || 3000;
const AMOUNT = 1000;

function mpesaBaseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function normalizePhone(phone) {
  const p = String(phone || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (/^07\d{8}$/.test(p)) return "254" + p.slice(1);
  if (/^01\d{8}$/.test(p)) return "254" + p.slice(1);
  if (/^254\d{9}$/.test(p)) return p;
  return null;
}

function timestamp() {
  const d = new Date();
  const parts = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0")
  ];
  return parts.join("");
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;

  if (!key || !secret || key.includes("PUT_YOUR") || secret.includes("PUT_YOUR")) {
    throw new Error("Daraja Consumer Key/Secret are not configured on the server.");
  }

  const basic = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${basic}` }
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || "Could not obtain Daraja access token.");
  }
  return data.access_token;
}

app.post("/api/mpesa/stkpush", async (req, res) => {
  try {
    const { name, email, bookingDate, bookingTime, phone, notes } = req.body;
    const normalized = normalizePhone(phone);

    if (!name || !email || !bookingDate || !bookingTime || !normalized) {
      return res.status(400).json({
        ok: false,
        message: "Please provide name, email, date, time and a valid Kenyan M-Pesa phone number."
      });
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callback = process.env.MPESA_CALLBACK_URL;

    if (!shortcode || !passkey || !callback ||
        shortcode.includes("PUT_YOUR") || passkey.includes("PUT_YOUR") ||
        callback.includes("YOUR-PUBLIC")) {
      return res.status(500).json({
        ok: false,
        message: "Daraja shortcode, passkey and public callback URL must be configured on the server."
      });
    }

    const accessToken = await getAccessToken();
    const time = timestamp();
    const password = crypto
      .createHash("sha256")
      .update(`${shortcode}${passkey}${time}`)
      .digest("base64");

    // Note: Standard Daraja STK password uses Base64 encoding of shortcode+passkey+timestamp.
    const stkPassword = Buffer.from(`${shortcode}${passkey}${time}`).toString("base64");

    const payload = {
      BusinessShortCode: shortcode,
      Password: stkPassword,
      Timestamp: time,
      TransactionType: "CustomerPayBillOnline",
      Amount: AMOUNT,
      PartyA: normalized,
      PartyB: shortcode,
      PhoneNumber: normalized,
      CallBackURL: callback,
      AccountReference: "Kevin.go.k",
      TransactionDesc: `Consultation ${bookingDate} ${bookingTime}`
    };

    const response = await fetch(
      `${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== "0") {
      return res.status(400).json({
        ok: false,
        message: data.errorMessage || data.ResponseDescription || "Safaricom rejected the STK Push request.",
        details: data
      });
    }

    return res.json({
      ok: true,
      message: "STK Push sent. Check the customer's M-Pesa phone.",
      merchantRequestID: data.MerchantRequestID,
      checkoutRequestID: data.CheckoutRequestID,
      customerMessage: data.CustomerMessage || ""
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: error.message || "Payment request failed."
    });
  }
});

app.post("/mpesa/callback", (req, res) => {
  console.log("M-Pesa callback received:", JSON.stringify(req.body, null, 2));

  // TODO for production:
  // 1. Verify/store the callback result in a database.
  // 2. Match CheckoutRequestID to the booking.
  // 3. Mark the booking paid only when ResultCode === 0.
  // 4. Send the customer a confirmation.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "Kevin.go.k M-Pesa backend", amount: AMOUNT });
});

app.listen(PORT, "0.0.0.0",()=>
  console.log(`Kevin.go.k server running on port ${PORT}`);
});
