import { Types } from "mongoose";
import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendPushNotification = async (
  userId: Types.ObjectId,
  payload: { title: string; message: string; metadata?: any }
) => {
  try {
    const userFcmToken = await getUserFcmToken(userId);
    if (!userFcmToken) return;

    const message = {
      token: userFcmToken,
      notification: { title: payload.title, body: payload.message },
      data: payload.metadata || {},
    };

    await admin.messaging().send(message);
    console.log(`✅ Push sent to user ${userId}`);
  } catch (err) {
    console.error("Push notification error:", err);
  }
};

const getUserFcmToken = async (userId: Types.ObjectId): Promise<string | null> => {
  // Replace with your DB logic
  return "user-fcm-token";
};
