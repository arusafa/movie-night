const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";

const hostname = "0.0.0.0";

const port = Number(process.env.PORT) || 3000;

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer(async (req, res) => {
      try {
        await handle(req, res);
      } catch (error) {
        console.error("Next request error:", error);

        res.statusCode = 500;

        res.end("Internal server error");
      }
    });

    const io = new Server(httpServer, {
      cors: {
        origin: true,

        methods: ["GET", "POST"],
      },
    });

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

        const cleanRoomId = roomId.trim();

        if (!cleanRoomId) {
          return;
        }

        /*
         * Leave previous room.
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
         * Only two people.
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
        });

        /*
         * Tell THIS client role.
         */

        socket.emit("room-joined", {
          isFirstUser,
        });

        /*
         * User #2 joined.
         *
         * Tell ONLY user #1.
         */

        if (!isFirstUser) {
          socket.to(cleanRoomId).emit("user-joined");
        }
      });

      /*
       * =====================================================
       * OFFER
       * =====================================================
       */

      socket.on("offer", ({ roomId, offer }) => {
        if (!roomId || !offer) {
          return;
        }

        console.log("📤 OFFER", socket.id);

        socket.to(roomId).emit("offer", offer);
      });

      /*
       * =====================================================
       * ANSWER
       * =====================================================
       */

      socket.on("answer", ({ roomId, answer }) => {
        if (!roomId || !answer) {
          return;
        }

        console.log("📥 ANSWER", socket.id);

        socket.to(roomId).emit("answer", answer);
      });

      /*
       * =====================================================
       * ICE
       * =====================================================
       */

      socket.on("ice-candidate", ({ roomId, candidate }) => {
        if (!roomId || !candidate) {
          return;
        }

        console.log("🧊 ICE", socket.id, candidate.type ?? "");

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
       * SCREEN STOPPED
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

        socket.to(roomId).emit("chat-message", {
          message,
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
       * LEAVE
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
      });

      /*
       * =====================================================
       * DISCONNECT
       * =====================================================
       */

      socket.on("disconnect", () => {
        const roomId = socket.data.roomId;

        console.log("❌ Socket disconnected:", socket.id);

        if (!roomId) {
          return;
        }

        socket.to(roomId).emit("user-left");
      });
    });

    httpServer.listen(port, hostname, () => {
      console.log(`🚀 Ready on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Server failed:", error);

    process.exit(1);
  });
