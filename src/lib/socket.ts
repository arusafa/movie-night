import {
  io,
  type Socket,
} from "socket.io-client";

let socket:
  Socket | null =
  null;

export function getSocket() {
  if (!socket) {
    const socketUrl =
      process.env
        .NEXT_PUBLIC_SOCKET_URL;

    if (!socketUrl) {
      throw new Error(
        "NEXT_PUBLIC_SOCKET_URL is missing."
      );
    }

    console.log(
      "[Socket] server:",
      socketUrl
    );

    socket = io(
      socketUrl,
      {
        autoConnect:
          false,

        transports: [
          "websocket",
          "polling",
        ],

        /*
         * Automatically reconnect
         * if internet briefly drops.
         */

        reconnection:
          true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay:
          1000,

        reconnectionDelayMax:
          5000,

        timeout:
          20000,
      }
    );

    /*
     * Useful production debugging.
     */

    socket.on(
      "connect",
      () => {
        console.log(
          "[Socket] connected:",
          socket?.id
        );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "[Socket] disconnected:",
          reason
        );
      }
    );

    socket.on(
      "connect_error",
      (error) => {
        console.warn(
          "[Socket] connection error:",
          error.message
        );
      }
    );
  }

  return socket;
}