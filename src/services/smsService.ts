// Example: Using Twilio
import Twilio from "twilio";
import type TwilioType from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

const client: TwilioType.Twilio = Twilio(accountSid, authToken);


/**
 * Send SMS to a phone number
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`SMS sent to ${to}`);
  } catch (err) {
    console.error("SMS sending error:", err);
  }
};
