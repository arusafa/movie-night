const http = require("http");
const { Server } = require("socket.io");

const port = Number(process.env.PORT) || 3001;

/*
 * =========================================================
 * ALLOWED FRONTEND ORIGINS
 * =========================================================
 *
 * Local development is always allowed.
 *
 * In Railway, CLIENT_ORIGINS can contain:
 *
 * https://movie-night-fawn-zeta.vercel.app
 *
 * Multiple domains can be comma-separated.
 */

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

/*
 * =========================================================
 * HTTP SERVER
 * =========================================================
 */

const httpServer = http.createServer((req, res) => {
  /*
   * Simple health endpoint.
   *
   * Visit:
   *
   * https://YOUR-RAILWAY-URL/health
   *
   * to verify Railway is running.
   */

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

/*
 * =========================================================
 * SOCKET.IO
 * =========================================================
 */

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      /*
       * Requests without Origin,
       * such as health checks,
       * are allowed.
       */

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

    credentials: false,
  },

  /*
   * Allow both WebSocket
   * and HTTP fallback.
   */

  transports: ["websocket", "polling"],

  pingTimeout: 20000,

  pingInterval: 25000,
});

/*
 * =========================================================
 * CONNECTION
 * =========================================================
 */

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  /*
   * =====================================================
   * JOIN ROOM
   * =====================================================
   */

  socket.on("join-room", async (roomId) => {
    if (typeof roomId !== "string") {
      return;
    }

    const cleanRoomId = roomId.trim().toUpperCase();

    if (!cleanRoomId) {
      return;
    }

    /*
     * Leave previous room
     * if necessary.
     */

    const oldRoomId = socket.data.roomId;

    if (oldRoomId && oldRoomId !== cleanRoomId) {
      socket.leave(oldRoomId);

      socket.to(oldRoomId).emit("user-left");
    }

    const room = io.sockets.adapter.rooms.get(cleanRoomId);

    /*
     * Already joined.
     */

    if (room?.has(socket.id)) {
      return;
    }

    const userCount = room?.size ?? 0;

    /*
     * Maximum two people.
     */

    if (userCount >= 2) {
      socket.emit("room-full");

      return;
    }

    const isFirstUser = userCount === 0;

    await socket.join(cleanRoomId);

    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${socket.id} joined ${cleanRoomId}`, {
      isFirstUser,
      userCount: userCount + 1,
    });

    /*
     * Tell this browser
     * whether it is person
     * #1 or #2.
     */

    socket.emit("room-joined", {
      isFirstUser,
    });

    /*
     * Person #2 arrived.
     *
     * Notify person #1 only.
     */

    if (!isFirstUser) {
      socket.to(cleanRoomId).emit("user-joined");
    }
  });

  /*
   * =====================================================
   * WEBRTC OFFER
   * =====================================================
   */

  socket.on("offer", ({ roomId, offer }) => {
    if (!roomId || !offer) {
      return;
    }

    console.log("📤 OFFER:", socket.id, "->", roomId);

    socket.to(roomId).emit("offer", offer);
  });

  /*
   * =====================================================
   * WEBRTC ANSWER
   * =====================================================
   */

  socket.on("answer", ({ roomId, answer }) => {
    if (!roomId || !answer) {
      return;
    }

    console.log("📥 ANSWER:", socket.id, "->", roomId);

    socket.to(roomId).emit("answer", answer);
  });

  /*
   * =====================================================
   * ICE CANDIDATE
   * =====================================================
   */

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    if (!roomId || !candidate) {
      return;
    }

    console.log("🧊 ICE:", socket.id, candidate.type ?? "");

    socket.to(roomId).emit("ice-candidate", candidate);
  });

  /*
   * =====================================================
   * VIDEO STATE
   * =====================================================
   */

  socket.on("video-state", ({ roomId, active }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("video-state", {
      active: Boolean(active),
    });
  });

  /*
   * =====================================================
   * SCREEN SHARE STOP
   * =====================================================
   */

  socket.on("screen-share-stopped", ({ roomId }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("screen-share-stopped");
  });

  /*
   * =====================================================
   * CHAT
   * =====================================================
   */

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

  /*
   * =====================================================
   * LOVE
   * =====================================================
   */

  socket.on("send-love", ({ roomId }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("receive-love");
  });

  /*
   * =====================================================
   * LEAVE ROOM
   * =====================================================
   */

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

    console.log("👋 Left room:", socket.id, roomId);
  });

  /*
   * =====================================================
   * DISCONNECT
   * =====================================================
   */

  socket.on("disconnect", (reason) => {
    const roomId = socket.data.roomId;

    console.log("❌ Socket disconnected:", socket.id, reason);

    if (!roomId) {
      return;
    }

    socket.to(roomId).emit("user-left");
  });
});

/*
 * =========================================================
 * START
 * =========================================================
 */

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Movie Night signaling server running on port ${port}`);
});
