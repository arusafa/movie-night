"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { getSocket } from "@/lib/socket";

import type {
  ChatMessage,
} from "@/components/ChatPanel";

interface UseMovieRoomOptions {
  roomId: string;
  enabled: boolean;
}

export function useMovieRoom({
  roomId,
  enabled,
}: UseMovieRoomOptions) {
  const socket = getSocket();

  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const [
    partnerConnected,
    setPartnerConnected,
  ] = useState(false);

  const [
    webRtcConnected,
    setWebRtcConnected,
  ] = useState(false);

  const [
    remoteVideoAvailable,
    setRemoteVideoAvailable,
  ] = useState(false);

  const [
    micOn,
    setMicOn,
  ] = useState(false);

  const [
    cameraOn,
    setCameraOn,
  ] = useState(false);

  const [
    localStream,
    setLocalStream,
  ] =
    useState<MediaStream | null>(
      null
    );

  const [
    sharing,
    setSharing,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>([]);

  const [
    popupMessage,
    setPopupMessage,
  ] =
    useState<string | null>(
      null
    );

  const [
    joinNotification,
    setJoinNotification,
  ] = useState(false);

  const [
    loveNotification,
    setLoveNotification,
  ] = useState(false);

  /*
   * =========================================================
   * WEBRTC REFS
   * =========================================================
   */

  const peerRef =
    useRef<RTCPeerConnection | null>(
      null
    );

  const videoSenderRef =
    useRef<RTCRtpSender | null>(
      null
    );

  const audioSenderRef =
    useRef<RTCRtpSender | null>(
      null
    );

  /*
   * =========================================================
   * REMOTE
   * =========================================================
   */

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const remoteStreamRef =
    useRef<MediaStream | null>(
      null
    );

  /*
   * =========================================================
   * LOCAL MEDIA
   * =========================================================
   */

  const cameraStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const micStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const screenStreamRef =
    useRef<MediaStream | null>(
      null
    );

  /*
   * =========================================================
   * VIDEO COMPOSITOR
   * =========================================================
   */

  const canvasStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const canvasAnimationRef =
    useRef<number | null>(
      null
    );

  const compositorStartedRef =
    useRef(false);

  const cameraVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const screenVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  /*
   * =========================================================
   * AUDIO
   * =========================================================
   */

  const audioContextRef =
    useRef<AudioContext | null>(
      null
    );

  /*
   * =========================================================
   * CURRENT STATE REFS
   * =========================================================
   */

  const partnerConnectedRef =
    useRef(false);

  const cameraOnRef =
    useRef(false);

  const micOnRef =
    useRef(false);

  const sharingRef =
    useRef(false);

  /*
   * =========================================================
   * ICE
   * =========================================================
   */

  const pendingCandidatesRef =
    useRef<
      RTCIceCandidateInit[]
    >([]);

  /*
   * =========================================================
   * TIMERS
   * =========================================================
   */

  const joinTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const popupTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const loveTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /*
   * =========================================================
   * REMOTE VIDEO
   * =========================================================
   */

  const attachRemoteStream =
    useCallback(() => {
      const video =
        remoteVideoRef.current;

      const stream =
        remoteStreamRef.current;

      if (
        !video ||
        !stream
      ) {
        return;
      }

      if (
        video.srcObject !==
        stream
      ) {
        video.srcObject =
          stream;
      }

      void video
        .play()
        .catch(() => {});
    }, []);

  /*
   * =========================================================
   * VIDEO STATE
   * =========================================================
   */

  const sendVideoState =
    useCallback(
      (active: boolean) => {
        socket.emit(
          "video-state",
          {
            roomId,
            active,
          }
        );
      },
      [
        roomId,
        socket,
      ]
    );

  /*
   * =========================================================
   * AUDIO
   * =========================================================
   */

  const closeAudioContext =
    useCallback(
      async () => {
        if (
          !audioContextRef.current
        ) {
          return;
        }

        try {
          await audioContextRef.current.close();
        } catch {}

        audioContextRef.current =
          null;
      },
      []
    );

  const rebuildOutgoingAudio =
    useCallback(
      async (
        includeScreenAudio: boolean
      ) => {
        const sender =
          audioSenderRef.current;

        if (!sender) {
          return;
        }

        await closeAudioContext();

        const micTrack =
          micStreamRef.current
            ?.getAudioTracks()[0];

        const screenTrack =
          screenStreamRef.current
            ?.getAudioTracks()[0];

        /*
         * No screen audio.
         */
        if (
          !includeScreenAudio ||
          !screenTrack
        ) {
          await sender.replaceTrack(
            micTrack &&
              micOnRef.current
              ? micTrack
              : null
          );

          return;
        }

        /*
         * Screen audio + optional mic.
         */

        const context =
          new AudioContext();

        audioContextRef.current =
          context;

        if (
          context.state ===
          "suspended"
        ) {
          try {
            await context.resume();
          } catch {}
        }

        const destination =
          context.createMediaStreamDestination();

        const screenSource =
          context.createMediaStreamSource(
            new MediaStream([
              screenTrack,
            ])
          );

        screenSource.connect(
          destination
        );

        if (
          micTrack &&
          micOnRef.current
        ) {
          const micSource =
            context.createMediaStreamSource(
              new MediaStream([
                micTrack,
              ])
            );

          micSource.connect(
            destination
          );
        }

        const mixedTrack =
          destination.stream
            .getAudioTracks()[0];

        await sender.replaceTrack(
          mixedTrack ?? null
        );
      },
      [
        closeAudioContext,
      ]
    );

  /*
   * =========================================================
   * CAMERA FULL SCREEN
   * =========================================================
   */

  const drawCameraFull =
    useCallback(
      (
        ctx:
          CanvasRenderingContext2D,

        video:
          HTMLVideoElement,

        canvas:
          HTMLCanvasElement
      ) => {
        const sourceWidth =
          video.videoWidth ||
          1280;

        const sourceHeight =
          video.videoHeight ||
          720;

        const sourceRatio =
          sourceWidth /
          sourceHeight;

        const targetRatio =
          canvas.width /
          canvas.height;

        let cropWidth =
          sourceWidth;

        let cropHeight =
          sourceHeight;

        let cropX = 0;
        let cropY = 0;

        if (
          sourceRatio >
          targetRatio
        ) {
          cropWidth =
            sourceHeight *
            targetRatio;

          cropX =
            (
              sourceWidth -
              cropWidth
            ) / 2;
        } else {
          cropHeight =
            sourceWidth /
            targetRatio;

          cropY =
            (
              sourceHeight -
              cropHeight
            ) / 2;
        }

        ctx.save();

        /*
         * Mirror camera.
         */

        ctx.translate(
          canvas.width,
          0
        );

        ctx.scale(
          -1,
          1
        );

        ctx.drawImage(
          video,

          cropX,
          cropY,
          cropWidth,
          cropHeight,

          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.restore();
      },
      []
    );

  /*
   * =========================================================
   * SCREEN FULL
   * =========================================================
   */

  const drawScreen =
    useCallback(
      (
        ctx:
          CanvasRenderingContext2D,

        video:
          HTMLVideoElement,

        canvas:
          HTMLCanvasElement
      ) => {
        const sourceWidth =
          video.videoWidth ||
          1280;

        const sourceHeight =
          video.videoHeight ||
          720;

        const sourceRatio =
          sourceWidth /
          sourceHeight;

        const targetRatio =
          canvas.width /
          canvas.height;

        let width =
          canvas.width;

        let height =
          canvas.height;

        let x = 0;
        let y = 0;

        if (
          sourceRatio >
          targetRatio
        ) {
          width =
            canvas.width;

          height =
            width /
            sourceRatio;

          y =
            (
              canvas.height -
              height
            ) / 2;
        } else {
          height =
            canvas.height;

          width =
            height *
            sourceRatio;

          x =
            (
              canvas.width -
              width
            ) / 2;
        }

        ctx.drawImage(
          video,
          x,
          y,
          width,
          height
        );
      },
      []
    );

  /*
   * =========================================================
   * CAMERA PIP
   * =========================================================
   */

  const drawCameraPip =
    useCallback(
      (
        ctx:
          CanvasRenderingContext2D,

        video:
          HTMLVideoElement,

        canvas:
          HTMLCanvasElement
      ) => {
        const width = 300;
        const height = 169;

        const margin = 28;

        const x =
          canvas.width -
          width -
          margin;

        const y =
          canvas.height -
          height -
          margin;

        const radius = 22;

        const sourceWidth =
          video.videoWidth ||
          1280;

        const sourceHeight =
          video.videoHeight ||
          720;

        const sourceRatio =
          sourceWidth /
          sourceHeight;

        const targetRatio =
          width /
          height;

        let cropWidth =
          sourceWidth;

        let cropHeight =
          sourceHeight;

        let cropX = 0;
        let cropY = 0;

        if (
          sourceRatio >
          targetRatio
        ) {
          cropWidth =
            sourceHeight *
            targetRatio;

          cropX =
            (
              sourceWidth -
              cropWidth
            ) / 2;
        } else {
          cropHeight =
            sourceWidth /
            targetRatio;

          cropY =
            (
              sourceHeight -
              cropHeight
            ) / 2;
        }

        ctx.save();

        ctx.shadowColor =
          "rgba(0,0,0,0.7)";

        ctx.shadowBlur = 30;

        ctx.shadowOffsetY = 8;

        ctx.beginPath();

        ctx.roundRect(
          x,
          y,
          width,
          height,
          radius
        );

        ctx.clip();

        /*
         * Mirror PiP.
         */

        ctx.translate(
          x + width,
          y
        );

        ctx.scale(
          -1,
          1
        );

        ctx.drawImage(
          video,

          cropX,
          cropY,
          cropWidth,
          cropHeight,

          0,
          0,
          width,
          height
        );

        ctx.restore();

        /*
         * Border.
         */

        ctx.save();

        ctx.beginPath();

        ctx.roundRect(
          x,
          y,
          width,
          height,
          radius
        );

        ctx.strokeStyle =
          "rgba(255,255,255,0.35)";

        ctx.lineWidth = 3;

        ctx.stroke();

        ctx.restore();

        /*
         * YOU badge.
         */

        ctx.save();

        ctx.fillStyle =
          "rgba(0,0,0,0.72)";

        ctx.beginPath();

        ctx.roundRect(
          x + 14,
          y +
            height -
            44,
          72,
          30,
          15
        );

        ctx.fill();

        ctx.fillStyle =
          "#ffffff";

        ctx.font =
          "600 13px system-ui";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "● You",
          x + 25,
          y +
            height -
            29
        );

        ctx.restore();
      },
      []
    );

  /*
   * =========================================================
   * PERMANENT COMPOSITOR
   * =========================================================
   */

  const ensureVideoCompositor =
    useCallback(
      async () => {
        if (
          compositorStartedRef.current
        ) {
          return;
        }

        const sender =
          videoSenderRef.current;

        if (!sender) {
          throw new Error(
            "Video sender is not ready."
          );
        }

        /*
         * Camera video.
         *
         * Creating this element does NOT
         * open the camera.
         */

        const cameraVideo =
          document.createElement(
            "video"
          );

        cameraVideo.autoplay =
          true;

        cameraVideo.muted =
          true;

        cameraVideo.playsInline =
          true;

        cameraVideoRef.current =
          cameraVideo;

        if (
          cameraStreamRef.current
        ) {
          cameraVideo.srcObject =
            cameraStreamRef.current;

          try {
            await cameraVideo.play();
          } catch {}
        }

        /*
         * Screen video.
         */

        const screenVideo =
          document.createElement(
            "video"
          );

        screenVideo.autoplay =
          true;

        screenVideo.muted =
          true;

        screenVideo.playsInline =
          true;

        screenVideoRef.current =
          screenVideo;

        if (
          screenStreamRef.current
        ) {
          screenVideo.srcObject =
            screenStreamRef.current;

          try {
            await screenVideo.play();
          } catch {}
        }

        /*
         * Canvas.
         */

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = 1280;
        canvas.height = 720;

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (!ctx) {
          throw new Error(
            "Canvas is unavailable."
          );
        }

        const draw =
          () => {
            /*
             * Background.
             */

            ctx.fillStyle =
              "#000";

            ctx.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            const cameraVideo =
              cameraVideoRef.current;

            const screenVideo =
              screenVideoRef.current;

            const cameraReady =
              Boolean(
                cameraOnRef.current &&
                  cameraVideo &&
                  cameraVideo.readyState >=
                    HTMLMediaElement.HAVE_CURRENT_DATA
              );

            const screenReady =
              Boolean(
                sharingRef.current &&
                  screenVideo &&
                  screenVideo.readyState >=
                    HTMLMediaElement.HAVE_CURRENT_DATA
              );

            /*
             * SCREEN
             */
            if (
              screenReady &&
              screenVideo
            ) {
              drawScreen(
                ctx,
                screenVideo,
                canvas
              );

              /*
               * SCREEN + CAMERA
               */
              if (
                cameraReady &&
                cameraVideo
              ) {
                drawCameraPip(
                  ctx,
                  cameraVideo,
                  canvas
                );
              }
            }

            /*
             * CAMERA ONLY
             */
            else if (
              cameraReady &&
              cameraVideo
            ) {
              drawCameraFull(
                ctx,
                cameraVideo,
                canvas
              );
            }

            canvasAnimationRef.current =
              requestAnimationFrame(
                draw
              );
          };

        draw();

        const canvasStream =
          canvas.captureStream(
            30
          );

        canvasStreamRef.current =
          canvasStream;

        const videoTrack =
          canvasStream
            .getVideoTracks()[0];

        if (!videoTrack) {
          throw new Error(
            "Canvas video track unavailable."
          );
        }

        await sender.replaceTrack(
          videoTrack
        );

        compositorStartedRef.current =
          true;
      },
      [
        drawCameraFull,
        drawCameraPip,
        drawScreen,
      ]
    );

  /*
   * =========================================================
   * ATTACH CAMERA
   * =========================================================
   */

  const attachCamera =
    useCallback(
      async () => {
        const video =
          cameraVideoRef.current;

        const stream =
          cameraStreamRef.current;

        if (
          !video ||
          !stream
        ) {
          return;
        }

        video.srcObject =
          stream;

        try {
          await video.play();
        } catch {}
      },
      []
    );

  /*
   * =========================================================
   * ATTACH SCREEN
   * =========================================================
   */

  const attachScreen =
    useCallback(
      async () => {
        const video =
          screenVideoRef.current;

        const stream =
          screenStreamRef.current;

        if (
          !video ||
          !stream
        ) {
          return;
        }

        video.srcObject =
          stream;

        try {
          await video.play();
        } catch {}
      },
      []
    );

  /*
   * =========================================================
   * STOP SCREEN
   * =========================================================
   */

  const stopScreenSharing =
    useCallback(
      async () => {
        sharingRef.current =
          false;

        setSharing(false);

        screenStreamRef.current
          ?.getTracks()
          .forEach(
            (track) => {
              track.onended =
                null;

              track.stop();
            }
          );

        screenStreamRef.current =
          null;

        const video =
          screenVideoRef.current;

        if (video) {
          video.pause();

          video.srcObject =
            null;
        }

        await rebuildOutgoingAudio(
          false
        );

        sendVideoState(
          cameraOnRef.current
        );

        socket.emit(
          "screen-share-stopped",
          {
            roomId,
          }
        );
      },
      [
        rebuildOutgoingAudio,
        roomId,
        sendVideoState,
        socket,
      ]
    );

  /*
   * =========================================================
   * WEBRTC
   * =========================================================
   */

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed =
      false;

    let isCaller =
      false;

    let restartAttempted =
      false;

    const peer =
      new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],

        iceTransportPolicy:
          "all",
      });

    peerRef.current =
      peer;

    /*
     * Remote MediaStream.
     */

    remoteStreamRef.current =
      new MediaStream();

    /*
     * Persistent video transceiver.
     */

    const videoTransceiver =
      peer.addTransceiver(
        "video",
        {
          direction:
            "sendrecv",
        }
      );

    videoSenderRef.current =
      videoTransceiver.sender;

    /*
     * Persistent audio transceiver.
     */

    const audioTransceiver =
      peer.addTransceiver(
        "audio",
        {
          direction:
            "sendrecv",
        }
      );

    audioSenderRef.current =
      audioTransceiver.sender;

    /*
     * =====================================================
     * REMOTE TRACK
     * =====================================================
     */

    peer.ontrack =
      (event) => {
        if (disposed) {
          return;
        }

        const stream =
          remoteStreamRef.current;

        if (!stream) {
          return;
        }

        const exists =
          stream
            .getTracks()
            .some(
              (track) =>
                track.id ===
                event.track.id
            );

        if (!exists) {
          stream.addTrack(
            event.track
          );
        }

        attachRemoteStream();

        event.track.onunmute =
          () => {
            attachRemoteStream();
          };

        event.track.onended =
          () => {
            stream.removeTrack(
              event.track
            );
          };
      };

    /*
     * =====================================================
     * ICE
     * =====================================================
     */

    peer.onicecandidate =
      (event) => {
        if (
          disposed ||
          !event.candidate
        ) {
          return;
        }

        const candidate =
          event.candidate;

        console.log(
          "[WebRTC] local ICE:",
          candidate.type,
          candidate.protocol
        );

        socket.emit(
          "ice-candidate",
          {
            roomId,

            candidate:
              candidate.toJSON(),
          }
        );
      };

    peer.oniceconnectionstatechange =
      () => {
        console.log(
          "[WebRTC] ICE:",
          peer.iceConnectionState
        );
      };

    peer.onconnectionstatechange =
      () => {
        if (disposed) {
          return;
        }

        const state =
          peer.connectionState;

        console.log(
          "[WebRTC] connection:",
          state
        );

        setWebRtcConnected(
          state ===
            "connected"
        );

        if (
          state ===
          "connected"
        ) {
          restartAttempted =
            false;
        }

        /*
         * One automatic ICE restart.
         */

        if (
          state ===
            "failed" &&
          isCaller &&
          !restartAttempted
        ) {
          restartAttempted =
            true;

          console.warn(
            "[WebRTC] restarting ICE"
          );

          void createOffer(
            true
          );
        }
      };

    /*
     * =====================================================
     * ICE QUEUE
     * =====================================================
     */

    const flushCandidates =
      async () => {
        if (
          !peer.remoteDescription
        ) {
          return;
        }

        const queued = [
          ...pendingCandidatesRef.current,
        ];

        pendingCandidatesRef.current =
          [];

        for (
          const candidate
          of queued
        ) {
          try {
            await peer.addIceCandidate(
              candidate
            );
          } catch {}
        }
      };

    /*
     * =====================================================
     * CREATE OFFER
     * =====================================================
     */

    const createOffer =
      async (
        iceRestart =
          false
      ) => {
        if (
          disposed ||
          !isCaller
        ) {
          return;
        }

        if (
          peer.signalingState !==
          "stable"
        ) {
          return;
        }

        try {
          const offer =
            await peer.createOffer({
              iceRestart,
            });

          await peer.setLocalDescription(
            offer
          );

          if (
            !peer.localDescription
          ) {
            return;
          }

          socket.emit(
            "offer",
            {
              roomId,

              offer:
                peer.localDescription,
            }
          );
        } catch (error) {
          console.warn(
            "[WebRTC] offer error:",
            error
          );
        }
      };

    /*
     * =====================================================
     * ROOM JOINED
     * =====================================================
     */

    const handleRoomJoined =
      ({
        isFirstUser,
      }: {
        isFirstUser:
          boolean;
      }) => {
        isCaller =
          isFirstUser;

        if (isFirstUser) {
          partnerConnectedRef.current =
            false;

          setPartnerConnected(
            false
          );

          return;
        }

        partnerConnectedRef.current =
          true;

        setPartnerConnected(
          true
        );

        sendVideoState(
          cameraOnRef.current ||
            sharingRef.current
        );
      };

    /*
     * =====================================================
     * SECOND USER JOINED
     * =====================================================
     */

    const handleUserJoined =
      async () => {
        isCaller =
          true;

        partnerConnectedRef.current =
          true;

        setPartnerConnected(
          true
        );

        setJoinNotification(
          true
        );

        if (
          joinTimeoutRef.current
        ) {
          clearTimeout(
            joinTimeoutRef.current
          );
        }

        joinTimeoutRef.current =
          setTimeout(
            () => {
              setJoinNotification(
                false
              );
            },
            4000
          );

        /*
         * Give user #2 a moment
         * to attach socket listeners.
         */

        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              100
            )
        );

        await createOffer(
          false
        );

        sendVideoState(
          cameraOnRef.current ||
            sharingRef.current
        );
      };

    /*
     * =====================================================
     * OFFER
     * =====================================================
     */

    const handleOffer =
      async (
        offer:
          RTCSessionDescriptionInit
      ) => {
        if (disposed) {
          return;
        }

        try {
          if (
            peer.signalingState !==
            "stable"
          ) {
            return;
          }

          await peer.setRemoteDescription(
            offer
          );

          await flushCandidates();

          const answer =
            await peer.createAnswer();

          await peer.setLocalDescription(
            answer
          );

          if (
            !peer.localDescription
          ) {
            return;
          }

          socket.emit(
            "answer",
            {
              roomId,

              answer:
                peer.localDescription,
            }
          );
        } catch (error) {
          console.warn(
            "[WebRTC] offer handling:",
            error
          );
        }
      };

    /*
     * =====================================================
     * ANSWER
     * =====================================================
     */

    const handleAnswer =
      async (
        answer:
          RTCSessionDescriptionInit
      ) => {
        if (disposed) {
          return;
        }

        if (
          peer.signalingState !==
          "have-local-offer"
        ) {
          return;
        }

        try {
          await peer.setRemoteDescription(
            answer
          );

          await flushCandidates();
        } catch (error) {
          console.warn(
            "[WebRTC] answer handling:",
            error
          );
        }
      };

    /*
     * =====================================================
     * REMOTE ICE
     * =====================================================
     */

    const handleIceCandidate =
      async (
        candidate:
          RTCIceCandidateInit
      ) => {
        if (disposed) {
          return;
        }

        if (
          !peer.remoteDescription
        ) {
          pendingCandidatesRef.current.push(
            candidate
          );

          return;
        }

        try {
          await peer.addIceCandidate(
            candidate
          );
        } catch (error) {
          console.warn(
            "[WebRTC] ICE candidate ignored:",
            error
          );
        }
      };

    /*
     * =====================================================
     * VIDEO STATE
     * =====================================================
     */

    const handleVideoState =
      ({
        active,
      }: {
        active:
          boolean;
      }) => {
        setRemoteVideoAvailable(
          active
        );

        if (active) {
          window.setTimeout(
            () => {
              attachRemoteStream();
            },
            50
          );
        }
      };

    /*
     * =====================================================
     * USER LEFT
     * =====================================================
     */

    const handleUserLeft =
      () => {
        partnerConnectedRef.current =
          false;

        setPartnerConnected(
          false
        );

        setWebRtcConnected(
          false
        );

        setRemoteVideoAvailable(
          false
        );

        if (
          remoteVideoRef.current
        ) {
          remoteVideoRef.current.srcObject =
            null;
        }

        const stream =
          remoteStreamRef.current;

        stream
          ?.getTracks()
          .forEach(
            (track) => {
              stream.removeTrack(
                track
              );
            }
          );
      };

    /*
     * =====================================================
     * CHAT
     * =====================================================
     */

    const handleChatMessage =
      ({
        message:
          incomingMessage,
      }: {
        message:
          string;
      }) => {
        setMessages(
          (current) => [
            ...current,

            {
              id:
                crypto.randomUUID(),

              text:
                incomingMessage,

              sender:
                "partner",
            },
          ]
        );

        setPopupMessage(
          incomingMessage
        );

        if (
          popupTimeoutRef.current
        ) {
          clearTimeout(
            popupTimeoutRef.current
          );
        }

        popupTimeoutRef.current =
          setTimeout(
            () => {
              setPopupMessage(
                null
              );
            },
            5000
          );
      };

    /*
     * =====================================================
     * LOVE
     * =====================================================
     */

    const handleLove =
      () => {
        setLoveNotification(
          true
        );

        if (
          loveTimeoutRef.current
        ) {
          clearTimeout(
            loveTimeoutRef.current
          );
        }

        loveTimeoutRef.current =
          setTimeout(
            () => {
              setLoveNotification(
                false
              );
            },
            2200
          );
      };

    /*
     * =====================================================
     * ROOM FULL
     * =====================================================
     */

    const handleRoomFull =
      () => {
        alert(
          "This room already has two people."
        );

        window.location.href =
          "/";
      };

    /*
     * =====================================================
     * LISTENERS
     * =====================================================
     */

    socket.on(
      "room-joined",
      handleRoomJoined
    );

    socket.on(
      "user-joined",
      handleUserJoined
    );

    socket.on(
      "offer",
      handleOffer
    );

    socket.on(
      "answer",
      handleAnswer
    );

    socket.on(
      "ice-candidate",
      handleIceCandidate
    );

    socket.on(
      "video-state",
      handleVideoState
    );

    socket.on(
      "user-left",
      handleUserLeft
    );

    socket.on(
      "chat-message",
      handleChatMessage
    );

    socket.on(
      "receive-love",
      handleLove
    );

    socket.on(
      "room-full",
      handleRoomFull
    );

    /*
     * =====================================================
     * JOIN
     * =====================================================
     */

    const joinRoom =
      () => {
        socket.emit(
          "join-room",
          roomId
        );
      };

    if (
      socket.connected
    ) {
      joinRoom();
    } else {
      socket.once(
        "connect",
        joinRoom
      );

      socket.connect();
    }

    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    return () => {
      disposed = true;

      socket.off(
        "connect",
        joinRoom
      );

      socket.off(
        "room-joined",
        handleRoomJoined
      );

      socket.off(
        "user-joined",
        handleUserJoined
      );

      socket.off(
        "offer",
        handleOffer
      );

      socket.off(
        "answer",
        handleAnswer
      );

      socket.off(
        "ice-candidate",
        handleIceCandidate
      );

      socket.off(
        "video-state",
        handleVideoState
      );

      socket.off(
        "user-left",
        handleUserLeft
      );

      socket.off(
        "chat-message",
        handleChatMessage
      );

      socket.off(
        "receive-love",
        handleLove
      );

      socket.off(
        "room-full",
        handleRoomFull
      );

      if (
        socket.connected
      ) {
        socket.emit(
          "leave-room",
          roomId
        );
      }

      if (
        joinTimeoutRef.current
      ) {
        clearTimeout(
          joinTimeoutRef.current
        );
      }

      if (
        popupTimeoutRef.current
      ) {
        clearTimeout(
          popupTimeoutRef.current
        );
      }

      if (
        loveTimeoutRef.current
      ) {
        clearTimeout(
          loveTimeoutRef.current
        );
      }

      cameraStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      micStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      screenStreamRef.current
        ?.getTracks()
        .forEach(
          (track) => {
            track.onended =
              null;

            track.stop();
          }
        );

      if (
        canvasAnimationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          canvasAnimationRef.current
        );
      }

      canvasStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      if (
        cameraVideoRef.current
      ) {
        cameraVideoRef.current.srcObject =
          null;
      }

      if (
        screenVideoRef.current
      ) {
        screenVideoRef.current.srcObject =
          null;
      }

      void closeAudioContext();

      peer.close();

      peerRef.current =
        null;

      videoSenderRef.current =
        null;

      audioSenderRef.current =
        null;

      remoteStreamRef.current =
        null;

      cameraStreamRef.current =
        null;

      micStreamRef.current =
        null;

      screenStreamRef.current =
        null;

      canvasStreamRef.current =
        null;

      cameraVideoRef.current =
        null;

      screenVideoRef.current =
        null;

      compositorStartedRef.current =
        false;

      pendingCandidatesRef.current =
        [];

      partnerConnectedRef.current =
        false;

      cameraOnRef.current =
        false;

      micOnRef.current =
        false;

      sharingRef.current =
        false;
    };
  }, [
    attachRemoteStream,
    closeAudioContext,
    enabled,
    roomId,
    sendVideoState,
    socket,
  ]);

  /*
   * =========================================================
   * CAMERA
   * =========================================================
   */

  const toggleCamera =
    useCallback(
      async () => {
        /*
         * First camera start.
         */

        if (
          !cameraStreamRef.current
        ) {
          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: {
                    width: {
                      ideal:
                        1280,
                    },

                    height: {
                      ideal:
                        720,
                    },

                    facingMode:
                      "user",
                  },

                  audio:
                    false,
                }
              );

            cameraStreamRef.current =
              stream;

            setLocalStream(
              stream
            );

            const track =
              stream
                .getVideoTracks()[0];

            if (!track) {
              throw new Error(
                "Camera unavailable."
              );
            }

            track.enabled =
              true;

            cameraOnRef.current =
              true;

            setCameraOn(
              true
            );

            await ensureVideoCompositor();

            await attachCamera();

            sendVideoState(
              true
            );

            return;
          } catch (error) {
            console.warn(
              "Camera failed:",
              error
            );

            alert(
              "Please allow camera access."
            );

            return;
          }
        }

        /*
         * Existing camera.
         */

        const track =
          cameraStreamRef.current
            .getVideoTracks()[0];

        if (!track) {
          return;
        }

        const next =
          !cameraOnRef.current;

        track.enabled =
          next;

        cameraOnRef.current =
          next;

        setCameraOn(
          next
        );

        if (next) {
          await ensureVideoCompositor();

          await attachCamera();
        }

        /*
         * Screen keeps remote video active
         * even when camera gets disabled.
         */

        sendVideoState(
          sharingRef.current ||
            next
        );
      },
      [
        attachCamera,
        ensureVideoCompositor,
        sendVideoState,
      ]
    );

  /*
   * =========================================================
   * MICROPHONE
   * =========================================================
   */

  const toggleMicrophone =
    useCallback(
      async () => {
        if (
          !micStreamRef.current
        ) {
          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  audio:
                    true,
                }
              );

            micStreamRef.current =
              stream;

            const track =
              stream
                .getAudioTracks()[0];

            if (!track) {
              throw new Error(
                "Microphone unavailable."
              );
            }

            track.enabled =
              true;

            micOnRef.current =
              true;

            setMicOn(
              true
            );

            await rebuildOutgoingAudio(
              sharingRef.current
            );

            return;
          } catch (error) {
            console.warn(
              "Microphone failed:",
              error
            );

            alert(
              "Please allow microphone access."
            );

            return;
          }
        }

        const track =
          micStreamRef.current
            .getAudioTracks()[0];

        if (!track) {
          return;
        }

        track.enabled =
          !track.enabled;

        micOnRef.current =
          track.enabled;

        setMicOn(
          track.enabled
        );

        await rebuildOutgoingAudio(
          sharingRef.current
        );
      },
      [
        rebuildOutgoingAudio,
      ]
    );

  /*
   * =========================================================
   * SCREEN SHARE
   * =========================================================
   */

  const shareScreen =
    useCallback(
      async () => {
        /*
         * Stop if already sharing.
         */

        if (
          sharingRef.current
        ) {
          await stopScreenSharing();

          return;
        }

        try {
          /*
           * IMPORTANT:
           *
           * NO camera permission here.
           * Screen and camera are independent.
           */

          const screenStream =
            await navigator.mediaDevices.getDisplayMedia(
              {
                video: {
                  frameRate: {
                    ideal:
                      30,

                    max:
                      30,
                  },
                },

                audio:
                  true,
              }
            );

          screenStreamRef.current =
            screenStream;

          /*
           * Create canvas if this is
           * first video action.
           */

          await ensureVideoCompositor();

          await attachScreen();

          /*
           * Attach camera ONLY if
           * camera was already enabled.
           */

          if (
            cameraOnRef.current &&
            cameraStreamRef.current
          ) {
            await attachCamera();
          }

          /*
           * Turn sharing mode on.
           */

          sharingRef.current =
            true;

          setSharing(
            true
          );

          /*
           * Screen audio +
           * microphone when enabled.
           */

          await rebuildOutgoingAudio(
            true
          );

          sendVideoState(
            true
          );

          /*
           * Browser's native
           * Stop Sharing button.
           */

          const screenTrack =
            screenStream
              .getVideoTracks()[0];

          if (screenTrack) {
            screenTrack.onended =
              () => {
                void stopScreenSharing();
              };
          }
        } catch (error) {
          /*
           * User cancelling screen picker
           * is normal.
           */

          console.warn(
            "Screen sharing stopped/cancelled:",
            error
          );

          screenStreamRef.current
            ?.getTracks()
            .forEach(
              (track) => {
                track.onended =
                  null;

                track.stop();
              }
            );

          screenStreamRef.current =
            null;

          const video =
            screenVideoRef.current;

          if (video) {
            video.pause();

            video.srcObject =
              null;
          }

          sharingRef.current =
            false;

          setSharing(false);

          await rebuildOutgoingAudio(
            false
          );

          sendVideoState(
            cameraOnRef.current
          );
        }
      },
      [
        attachCamera,
        attachScreen,
        ensureVideoCompositor,
        rebuildOutgoingAudio,
        sendVideoState,
        stopScreenSharing,
      ]
    );

  /*
   * =========================================================
   * CHAT
   * =========================================================
   */

  const sendMessage =
    useCallback(() => {
      const text =
        message.trim();

      if (!text) {
        return;
      }

      setMessages(
        (current) => [
          ...current,

          {
            id:
              crypto.randomUUID(),

            text,

            sender:
              "me",
          },
        ]
      );

      socket.emit(
        "chat-message",
        {
          roomId,

          message:
            text,
        }
      );

      setMessage("");
    }, [
      message,
      roomId,
      socket,
    ]);

  /*
   * =========================================================
   * LOVE
   * =========================================================
   */

  const sendLove =
    useCallback(() => {
      socket.emit(
        "send-love",
        {
          roomId,
        }
      );
    }, [
      roomId,
      socket,
    ]);

  /*
   * =========================================================
   * RETURN
   * =========================================================
   */

  return {
    partnerConnected,

    webRtcConnected,

    remoteVideoAvailable,

    remoteVideoRef,

    micOn,

    cameraOn,

    localStream,

    sharing,

    message,

    setMessage,

    messages,

    popupMessage,

    joinNotification,

    loveNotification,

    toggleMicrophone,

    toggleCamera,

    shareScreen,

    sendMessage,

    sendLove,
  };
}