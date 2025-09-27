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
exports.updateStock = exports.increaseStock = exports.decreaseStock = void 0;
const Product_1 = __importDefault(require("../models/Product"));
/**
 * Decrease stock when adding to cart
 */
const decreaseStock = (productId, quantity) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield Product_1.default.findById(productId);
    if (!product)
        throw new Error("Product not found");
    if (product.stock < quantity)
        throw new Error("Insufficient stock");
    product.stock -= quantity;
    yield product.save();
    return product;
});
exports.decreaseStock = decreaseStock;
/**
 * Increase stock when removing from cart
 */
const increaseStock = (productId, quantity) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield Product_1.default.findById(productId);
    if (!product)
        throw new Error("Product not found");
    product.stock += quantity;
    yield product.save();
    return product;
});
exports.increaseStock = increaseStock;
/**
 * Update stock when updating cart quantity
 * prevQuantity: previous quantity in cart
 * newQuantity: updated quantity in cart
 */
const updateStock = (productId, prevQuantity, newQuantity) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield Product_1.default.findById(productId);
    if (!product)
        throw new Error("Product not found");
    const diff = newQuantity - prevQuantity; // positive -> decrease, negative -> increase
    if (diff > 0 && product.stock < diff)
        throw new Error("Insufficient stock");
    product.stock -= diff; // will increase if diff < 0
    yield product.save();
    return product;
});
exports.updateStock = updateStock;
