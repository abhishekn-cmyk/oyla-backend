"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaruntController_1 = require("../controllers/restaruntController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// ----------------- PUBLIC ROUTES -----------------
router.get("/", restaruntController_1.getRestaurants); // Get all restaurants
router.get("/:id", restaruntController_1.getRestaurantById); // Get restaurant by ID
// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------
router.post("/", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), restaruntController_1.createRestaurant);
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), restaruntController_1.updateRestaurant);
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), restaruntController_1.deleteRestaurant);
// Add products to restaurant
router.post("/:restaurantId/menu", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), restaruntController_1.addProductToMenu);
router.post("/:restaurantId/popularMenu", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), restaruntController_1.addProductToPopularMenu);
exports.default = router;
