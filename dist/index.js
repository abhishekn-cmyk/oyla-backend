"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDashboardNotification = void 0;
const Notification_1 = __importDefault(require("./models/Notification"));
const server_1 = require("./server");
// io already created
server_1.io.on("connection", (socket) => {
    console.log("Client connected: " + socket.id);
    // Join dashboard room
    socket.on("join_dashboard", () => {
        socket.join("dashboard");
        console.log("Dashboard client joined:", socket.id);
    });
    socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});
// Helper to send new notification to dashboard
const sendDashboardNotification = (notificationId) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield Notification_1.default.findById(notificationId).populate("user");
    if (!notification)
        return;
    // Emit to all dashboard clients
    server_1.io.to("dashboard").emit("new-notification", notification);
});
exports.sendDashboardNotification = sendDashboardNotification;
