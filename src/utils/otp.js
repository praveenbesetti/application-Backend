// ─────────────────────────────────────────────────────────
// OTP UTILITY
// In development: OTP is returned in response (for testing)
// In production:  Send via Twilio / MSG91 / Fast2SMS
// ─────────────────────────────────────────────────────────

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;

// Generate numeric OTP
const generateOtp = () => {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

// Send OTP via SMS
// Replace this with Twilio / MSG91 in production
const sendOtp = async (phone, otp) => {
  if (process.env.NODE_ENV === 'production') {
    // ── PRODUCTION: Uncomment and configure one of these ──

    // Option 1: Twilio
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await client.messages.create({
    //   body: `Your QuickBasket OTP is ${otp}. Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    //   from: process.env.TWILIO_PHONE,
    //   to:   `+91${phone}`,
    // });

    // Option 2: MSG91
    // const msg91 = require('msg91');
    // await msg91.send(phone, otp);

    console.log(`📱 OTP sent to +91${phone}: ${otp}`);
    return { sent: true };
  }

  // Development: just log it
  console.log(`\n📱 DEV OTP for +91${phone}: ${otp}\n`);
  return { sent: true, otp }; // return OTP in dev for easy testing
};

module.exports = { generateOtp, sendOtp };
