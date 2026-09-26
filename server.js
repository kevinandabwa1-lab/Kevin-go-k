
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Kevin.go.k Consultation Booking"
  });
});

app.post("/api/mpesa/stkpush", async (req, res) => {
  try {
    const {
      phone,
      amount = 1000,
      name,
      email,
      date,
      time
    } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "M-Pesa phone number is required"
      });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (
      !consumerKey ||
      !consumerSecret ||
      !shortcode ||
      !passkey ||
      !callbackUrl
    ) {
      return res.status(500).json({
        success: false,
        message: "M-Pesa environment variables are not configured"
      });
    }

    const baseUrl =
      process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    const credentials = Buffer
      .from(`${consumerKey}:${consumerSecret}`)
      .toString("base64");

    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({
        success: false,
        message: "Could not obtain M-Pesa access token"
      });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    const password = Buffer
      .from(`${shortcode}${passkey}${timestamp}`)
      .toString("base64");

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Number(amount),
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: "Kevin.go.k",
          TransactionDesc: `Consultation - ${name || "Customer"}`
        })
      }
    );

    const stkData = await stkResponse.json();

    if (!stkResponse.ok) {
      return res.status(500).json({
        success: false,
        message: "M-Pesa STK request failed",
        details: stkData
      });
    }

    res.json({
      success: true,
      message: "M-Pesa payment prompt sent",
      data: stkData
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Payment
