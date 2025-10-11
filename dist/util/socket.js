"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (server) => {
    if (io)
        return io;
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        console.log("🟢 Socket connected:", socket.id);
        socket.on("join", (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });
        socket.on("disconnect", () => {
            console.log("🔴 Socket disconnected:", socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error("Socket.io not initialized. Call initSocket(server) first.");
    return io;
};
exports.getIO = getIO;
