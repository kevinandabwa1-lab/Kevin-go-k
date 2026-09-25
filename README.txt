KEVIN.GO.K CONSULTATION BOOKING + M-PESA EXPRESS
=================================================

Consultation price:
KSh 1,000

IMPORTANT SECURITY
------------------
Never put your Daraja Consumer Secret in index.html or browser JavaScript.
Never send your Consumer Secret to anyone in chat.

WHAT THIS PROJECT DOES
----------------------
- Shows a consultation booking form.
- Charges KSh 1,000.
- Sends an M-Pesa STK Push through Safaricom Daraja.
- Receives the Daraja callback at /mpesa/callback.

WHAT YOU STILL NEED
-------------------
1. A Daraja Consumer Key and Consumer Secret.
2. A Daraja M-Pesa shortcode and passkey suitable for the environment you are using.
3. A public HTTPS callback URL.
4. A server/host where this Node.js application can run.

SETUP
-----
1. Install Node.js 18+.
2. Extract this folder.
3. Open a terminal in this folder.
4. Run:
       npm install
5. Copy .env.example to .env.
6. Fill in .env with your Daraja credentials.
7. Set MPESA_CALLBACK_URL to:
       https://YOUR-DOMAIN/mpesa/callback
8. Start:
       npm start
9. Open:
       http://localhost:3000

SANDBOX
-------
Use:
       MPESA_ENV=sandbox

PRODUCTION
----------
Only change to:
       MPESA_ENV=production
after your Daraja production credentials and callback configuration are ready.

IMPORTANT
---------
The number 0794627995 is displayed in the project documentation as your receiving/contact number,
but an STK Push request uses a Daraja-configured Business Short Code/Till setup. Do not assume
a personal mobile number can be used as BusinessShortCode.

PAYMENT CONFIRMATION
--------------------
The callback route currently accepts and logs the callback. Before using this for real bookings,
store the transaction/booking in a database and mark it paid only when Safaricom's callback
ResultCode is successful.

OFFICIAL DARaja PORTAL
----------------------
https://developer.safaricom.co.ke/
