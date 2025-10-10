import Notification from "./models/Notification";
import { io } from "./server";

// io already created
io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  // Join dashboard room
  socket.on("join_dashboard", () => {
    socket.join("dashboard");
    console.log("Dashboard client joined:", socket.id);
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// Helper to send new notification to dashboard
export const sendDashboardNotification = async (notificationId: string) => {
  const notification = await Notification.findById(notificationId).populate("user");
  if (!notification) return;

  // Emit to all dashboard clients
  io.to("dashboard").emit("new-notification", notification);
};
