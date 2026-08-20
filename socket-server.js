const http = require("http");

const { Server } = require("socket.io");

const port = Number(process.env.PORT) || 3001;

const productionOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...productionOrigins,
];

console.log("🌐 Allowed origins:", allowedOrigins);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        ok: true,
        service: "movie-night-socket",
      }),
    );

    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
  });

  res.end("Movie Night signaling server");
});

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);

        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);

        return;
      }

      console.warn("🚫 Blocked origin:", origin);

      callback(new Error("Origin not allowed"));
    },

    methods: ["GET", "POST"],
  },

  transports: ["websocket", "polling"],

  pingTimeout: 20000,

  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  /* =======================================================
   * JOIN
   * ===================================================== */

  socket.on("join-room", async (roomId) => {
    if (typeof roomId !== "string") {
      return;
    }

    const cleanRoomId = roomId.trim().toUpperCase();

    if (!cleanRoomId) {
      return;
    }

    const oldRoomId = socket.data.roomId;

    if (oldRoomId && oldRoomId !== cleanRoomId) {
      socket.leave(oldRoomId);

      socket.to(oldRoomId).emit("user-left");
    }

    const room = io.sockets.adapter.rooms.get(cleanRoomId);

    if (room?.has(socket.id)) {
      return;
    }

    const userCount = room?.size ?? 0;

    if (userCount >= 2) {
      socket.emit("room-full");

      return;
    }

    const isFirstUser = userCount === 0;

    await socket.join(cleanRoomId);

    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${socket.id} joined ${cleanRoomId}`, {
      isFirstUser,
    });

    socket.emit("room-joined", {
      isFirstUser,
    });

    if (!isFirstUser) {
      socket.to(cleanRoomId).emit("user-joined");
    }
  });

  /* =======================================================
   * OFFER
   * ===================================================== */

  socket.on("offer", ({ roomId, offer }) => {
    if (!roomId || !offer) {
      return;
    }

    socket.to(roomId).emit("offer", offer);
  });

  /* =======================================================
   * ANSWER
   * ===================================================== */

  socket.on("answer", ({ roomId, answer }) => {
    if (!roomId || !answer) {
      return;
    }

    socket.to(roomId).emit("answer", answer);
  });

  /* =======================================================
   * ICE
   * ===================================================== */

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    if (!roomId || !candidate) {
      return;
    }

    socket.to(roomId).emit("ice-candidate", candidate);
  });

  /* =======================================================
   * MEDIA STATE
   *
   * Camera and screen are now independent.
   * ===================================================== */

  socket.on("media-state", ({ roomId, camera, screen }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("media-state", {
      camera: Boolean(camera),

      screen: Boolean(screen),
    });
  });

  /* =======================================================
   * CHAT
   * ===================================================== */

  socket.on("chat-message", ({ roomId, message }) => {
    if (!roomId || typeof message !== "string") {
      return;
    }

    const cleanMessage = message.trim().slice(0, 2000);

    if (!cleanMessage) {
      return;
    }

    socket.to(roomId).emit("chat-message", {
      message: cleanMessage,
    });
  });

  /* =======================================================
   * LOVE
   * ===================================================== */

  socket.on("send-love", ({ roomId }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("receive-love");
  });

  /* =======================================================
   * LEAVE
   * ===================================================== */

  socket.on("leave-room", (roomId) => {
    if (typeof roomId !== "string") {
      return;
    }

    if (socket.data.roomId !== roomId) {
      return;
    }

    socket.leave(roomId);

    socket.to(roomId).emit("user-left");

    socket.data.roomId = undefined;
  });

  /* =======================================================
   * DISCONNECT
   * ===================================================== */

  socket.on("disconnect", (reason) => {
    const roomId = socket.data.roomId;

    console.log("❌ Socket disconnected:", socket.id, reason);

    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("user-left");
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Movie Night signaling server running on port ${port}`);
});
