import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/userRoutes";
import cors from "cors";
dotenv.config();
import admin from "./routes/superadminRoutes";
import Language from "./routes/LanguageRoutes";
import Program from "./routes/ProgramRoutes";
import Product from "./routes/productRoutes";
import Restaurant from "./routes/RestaruntRoutes";
import Cart from "./routes/CartRouter";
import Order from "./routes/OrderRoutes";
const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use('/admin',admin);
app.use('/language',Language);
app.use('/program',Program);
app.use('/product',Product);
app.use('/restaurant',Restaurant);
app.use('/cart',Cart);
app.use('/order',Order);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));
