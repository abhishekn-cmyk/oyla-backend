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
exports.io = void 0;
// server.ts
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const node_cron_1 = __importDefault(require("node-cron"));
// Routes
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const SystemRoutes_1 = __importDefault(require("./routes/SystemRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const superadminRoutes_1 = __importDefault(require("./routes/superadminRoutes"));
const LanguageRoutes_1 = __importDefault(require("./routes/LanguageRoutes"));
const ProgramRoutes_1 = __importDefault(require("./routes/ProgramRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const RestaruntRoutes_1 = __importDefault(require("./routes/RestaruntRoutes")); // fixed typo
const CartRouter_1 = __importDefault(require("./routes/CartRouter"));
const deliveryRoutes_1 = __importDefault(require("./routes/deliveryRoutes")); // fixed typo
const OrderRoutes_1 = __importDefault(require("./routes/OrderRoutes"));
const PrivacyRoutes_1 = __importDefault(require("./routes/PrivacyRoutes"));
const RewardRoutes_1 = __importDefault(require("./routes/RewardRoutes"));
const ContactusRoutes_1 = __importDefault(require("./routes/ContactusRoutes"));
const freezeRoutes_1 = __importDefault(require("./routes/freezeRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const carouselRoutes_1 = __importDefault(require("./routes/carouselRoutes"));
const successRoutes_1 = __importDefault(require("./routes/successRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
// Models
const Notification_1 = __importDefault(require("./models/Notification"));
const Reward_1 = __importDefault(require("./models/Reward"));
const Subscription_1 = __importDefault(require("./models/Subscription"));
// Middleware
const admin_1 = require("./middleware/admin");
// Cron / Workers
require("./cron/subscriptionCron");
require("./workers/subscriptionWorker");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Create HTTP server for socket.io
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
});
// ------------------ Socket.IO ------------------
exports.io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });
    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`Joined room: ${room}`);
    });
    socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});
// ------------------ Cron Jobs ------------------
// Delete expired rewards daily at midnight
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const result = yield Reward_1.default.deleteMany({ expiryDate: { $lte: now } });
    console.log(`Deleted ${result.deletedCount} expired rewards`);
}));
// Expire subscriptions daily at midnight
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    yield Subscription_1.default.updateMany({ status: "active", endDate: { $lt: now } }, { $set: { status: "expired" } });
    // Unfreeze subscriptions whose freeze period ended
    const subs = yield Subscription_1.default.find({ status: "freeze" });
    for (const sub of subs) {
        const lastFreeze = sub.freezeHistory[sub.freezeHistory.length - 1];
        if (lastFreeze && lastFreeze.endDate < now) {
            sub.status = "active";
            yield sub.save();
        }
    }
    console.log("✅ Subscription maintenance completed");
}));
// ------------------ Test / Dashboard ------------------
app.get("/", (req, res) => {
    res.send("Welcome to Oyla Backend");
});
app.get("/dashboard", admin_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield Notification_1.default.find({})
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({
            message: "Welcome to the admin dashboard!",
            notifications,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// ------------------ API Routes ------------------
app.use("/auth", userRoutes_1.default);
app.use('/expenses', expenseRoutes_1.default);
app.use("/notification", notificationRoutes_1.default);
app.use("/success", successRoutes_1.default);
app.use("/freeze", freezeRoutes_1.default);
app.use("/contactus", ContactusRoutes_1.default);
app.use("/admin", superadminRoutes_1.default);
app.use("/language", LanguageRoutes_1.default);
app.use("/program", ProgramRoutes_1.default);
app.use("/product", productRoutes_1.default);
app.use("/carousel", carouselRoutes_1.default);
app.use("/restaurant", RestaruntRoutes_1.default);
app.use("/subscription", subscriptionRoutes_1.default);
app.use("/wallet", walletRoutes_1.default);
app.use("/cart", CartRouter_1.default);
app.use("/reward", RewardRoutes_1.default);
app.use("/system", SystemRoutes_1.default);
app.use("/order", OrderRoutes_1.default);
app.use("/delivery", deliveryRoutes_1.default);
app.use("/privacy", PrivacyRoutes_1.default);
app.use('/driver', driverRoutes_1.default);
app.use("/uploads", express_1.default.static("uploads"));
// ------------------ MongoDB & Server ------------------
const PORT = process.env.PORT || 5000;
mongoose_1.default
    .connect(process.env.MONGO_URI || "")
    .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
    .catch((err) => console.error("MongoDB connection error:", err));
