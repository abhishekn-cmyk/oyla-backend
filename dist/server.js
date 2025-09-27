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
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const superadminRoutes_1 = __importDefault(require("./routes/superadminRoutes"));
const LanguageRoutes_1 = __importDefault(require("./routes/LanguageRoutes"));
const ProgramRoutes_1 = __importDefault(require("./routes/ProgramRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const RestaruntRoutes_1 = __importDefault(require("./routes/RestaruntRoutes"));
const CartRouter_1 = __importDefault(require("./routes/CartRouter"));
const OrderRoutes_1 = __importDefault(require("./routes/OrderRoutes"));
const PrivacyRoutes_1 = __importDefault(require("./routes/PrivacyRoutes"));
const RewardRoutes_1 = __importDefault(require("./routes/RewardRoutes"));
const node_cron_1 = __importDefault(require("node-cron"));
const Reward_1 = __importDefault(require("./models/Reward"));
const Subscription_1 = __importDefault(require("./models/Subscription"));
const ContactusRoutes_1 = __importDefault(require("./routes/ContactusRoutes"));
const freezeRoutes_1 = __importDefault(require("./routes/freezeRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const carouselRoutes_1 = __importDefault(require("./routes/carouselRoutes"));
const successRoutes_1 = __importDefault(require("./routes/successRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Run every day at midnight
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const result = yield Reward_1.default.deleteMany({ expiryDate: { $lte: now } });
    console.log(`Deleted ${result.deletedCount} expired rewards`);
}));
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    yield Subscription_1.default.updateMany({ endDate: { $lt: now }, status: "active" }, { $set: { status: "expired" } });
    console.log("✅ Expired subscriptions updated");
}));
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("⏰ Running daily subscription maintenance job...");
    const now = new Date();
    // Expire subscriptions whose endDate passed
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
    console.log("✅ Subscription statuses updated");
}));
app.use("/auth", userRoutes_1.default);
app.use('/success', successRoutes_1.default);
app.use('/freeze', freezeRoutes_1.default);
app.use('/contactus', ContactusRoutes_1.default);
app.use('/admin', superadminRoutes_1.default);
app.use('/language', LanguageRoutes_1.default);
app.use('/program', ProgramRoutes_1.default);
app.use('/product', productRoutes_1.default);
app.use('/carousel', carouselRoutes_1.default);
app.use('/restaurant', RestaruntRoutes_1.default);
app.use('/subscription', subscriptionRoutes_1.default);
app.use('/wallet', walletRoutes_1.default);
app.use('/cart', CartRouter_1.default);
app.use('/reward', RewardRoutes_1.default);
app.use('/order', OrderRoutes_1.default);
app.use('/privacy', PrivacyRoutes_1.default);
app.use("/uploads", express_1.default.static("uploads"));
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send('Welcome to Oyla Backend');
}));
mongoose_1.default
    .connect(process.env.MONGO_URI || "")
    .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
    .catch((err) => console.error(err));
