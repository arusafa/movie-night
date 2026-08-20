"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSocket } from "@/lib/socket";

import type { ChatMessage } from "@/components/ChatPanel";

interface UseMovieRoomOptions {
  roomId: string;
  enabled: boolean;
}

export function useMovieRoom({ roomId, enabled }: UseMovieRoomOptions) {
  const socket = getSocket();

  /* =========================================================
   * UI STATE
   * ======================================================= */

  const [partnerConnected, setPartnerConnected] = useState(false);

  const [webRtcConnected, setWebRtcConnected] = useState(false);

  const [remoteVideoAvailable, setRemoteVideoAvailable] = useState(false);

  const [micOn, setMicOn] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [sharing, setSharing] = useState(false);

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const [joinNotification, setJoinNotification] = useState(false);

  const [loveNotification, setLoveNotification] = useState(false);

  /* =========================================================
   * WEBRTC
   * ======================================================= */

  const peerRef = useRef<RTCPeerConnection | null>(null);

  const videoSenderRef = useRef<RTCRtpSender | null>(null);

  const audioSenderRef = useRef<RTCRtpSender | null>(null);

  /* =========================================================
   * REMOTE MEDIA
   * ======================================================= */

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const remoteStreamRef = useRef<MediaStream | null>(null);

  /* =========================================================
   * LOCAL MEDIA
   * ======================================================= */

  const cameraStreamRef = useRef<MediaStream | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);

  /* =========================================================
   * VIDEO COMPOSITOR
   * ======================================================= */

  const canvasStreamRef = useRef<MediaStream | null>(null);

  const canvasAnimationRef = useRef<number | null>(null);

  const compositorStartedRef = useRef(false);

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  /* =========================================================
   * AUDIO
   * ======================================================= */

  const audioContextRef = useRef<AudioContext | null>(null);

  /* =========================================================
   * LIVE STATE REFS
   * ======================================================= */

  const partnerConnectedRef = useRef(false);

  const cameraOnRef = useRef(false);

  const micOnRef = useRef(false);

  const sharingRef = useRef(false);

  /* =========================================================
   * ICE
   * ======================================================= */

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  /* =========================================================
   * TIMERS
   * ======================================================= */

  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* =========================================================
   * REMOTE STREAM
   * ======================================================= */

  const attachRemoteStream = useCallback(() => {
    const video = remoteVideoRef.current;

    const stream = remoteStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch(() => {});
  }, []);

  /* =========================================================
   * VIDEO VISIBILITY SIGNAL
   * ======================================================= */

  const sendVideoState = useCallback(
    (active: boolean) => {
      socket.emit("video-state", {
        roomId,
        active,
      });
    },
    [roomId, socket],
  );

  /* =========================================================
   * AUDIO HELPERS
   * ======================================================= */

  const closeAudioContext = useCallback(async () => {
    const context = audioContextRef.current;

    if (!context) {
      return;
    }

    try {
      await context.close();
    } catch {
      // Ignore cleanup error.
    }

    audioContextRef.current = null;
  }, []);

  const rebuildOutgoingAudio = useCallback(
    async (includeScreenAudio: boolean) => {
      const sender = audioSenderRef.current;

      if (!sender) {
        return;
      }

      await closeAudioContext();

      const micTrack = micStreamRef.current?.getAudioTracks()[0];

      const screenTrack = screenStreamRef.current?.getAudioTracks()[0];

      /*
       * No screen audio:
       * send microphone only.
       */
      if (!includeScreenAudio || !screenTrack) {
        await sender.replaceTrack(
          micTrack && micOnRef.current ? micTrack : null,
        );

        return;
      }

      /*
       * Screen audio exists.
       * Mix screen audio +
       * microphone if mic is ON.
       */

      const context = new AudioContext();

      audioContextRef.current = context;

      if (context.state === "suspended") {
        try {
          await context.resume();
        } catch {
          // Ignore.
        }
      }

      const destination = context.createMediaStreamDestination();

      /*
       * Screen audio.
       */
      const screenSource = context.createMediaStreamSource(
        new MediaStream([screenTrack]),
      );

      screenSource.connect(destination);

      /*
       * Microphone.
       */
      if (micTrack && micOnRef.current) {
        const micSource = context.createMediaStreamSource(
          new MediaStream([micTrack]),
        );

        micSource.connect(destination);
      }

      const outputTrack = destination.stream.getAudioTracks()[0];

      await sender.replaceTrack(outputTrack ?? null);
    },
    [closeAudioContext],
  );

  /* =========================================================
   * DRAW SCREEN
   * ======================================================= */

  const drawScreen = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
    ) => {
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }

      const sourceWidth = video.videoWidth;

      const sourceHeight = video.videoHeight;

      const sourceRatio = sourceWidth / sourceHeight;

      const canvasRatio = canvas.width / canvas.height;

      let cropWidth = sourceWidth;

      let cropHeight = sourceHeight;

      let cropX = 0;
      let cropY = 0;

      /*
       * object-cover behavior.
       *
       * Fill the ENTIRE 1280x720 canvas.
       * No black bars.
       */

      if (sourceRatio > canvasRatio) {
        /*
         * Source is wider than canvas.
         * Crop left/right.
         */

        cropWidth = sourceHeight * canvasRatio;

        cropX = (sourceWidth - cropWidth) / 2;
      } else {
        /*
         * Source is taller than canvas.
         * Crop top/bottom.
         */

        cropHeight = sourceWidth / canvasRatio;

        cropY = (sourceHeight - cropHeight) / 2;
      }

      ctx.drawImage(
        video,

        cropX,
        cropY,
        cropWidth,
        cropHeight,

        0,
        0,
        canvas.width,
        canvas.height,
      );
    },
    [],
  );

  /* =========================================================
   * DRAW CAMERA PIP
   *
   * Camera is ALWAYS bottom-right.
   * Never full screen.
   * ======================================================= */

  const drawCameraPip = useCallback(
    (
      ctx: CanvasRenderingContext2D,

      video: HTMLVideoElement,

      canvas: HTMLCanvasElement,
    ) => {
      const width = 300;
      const height = 169;
      const margin = 28;

      const x = canvas.width - width - margin;

      const y = canvas.height - height - margin;

      const radius = 22;

      const sourceWidth = video.videoWidth || 1280;

      const sourceHeight = video.videoHeight || 720;

      const sourceRatio = sourceWidth / sourceHeight;

      const targetRatio = width / height;

      let cropWidth = sourceWidth;

      let cropHeight = sourceHeight;

      let cropX = 0;
      let cropY = 0;

      /*
       * object-cover camera crop.
       */
      if (sourceRatio > targetRatio) {
        cropWidth = sourceHeight * targetRatio;

        cropX = (sourceWidth - cropWidth) / 2;
      } else {
        cropHeight = sourceWidth / targetRatio;

        cropY = (sourceHeight - cropHeight) / 2;
      }

      /*
       * Camera shadow + clipping.
       */

      ctx.save();

      ctx.shadowColor = "rgba(0,0,0,0.75)";

      ctx.shadowBlur = 30;

      ctx.shadowOffsetY = 8;

      ctx.beginPath();

      ctx.roundRect(x, y, width, height, radius);

      ctx.clip();

      /*
       * Mirror selfie camera.
       */

      ctx.translate(x + width, y);

      ctx.scale(-1, 1);

      ctx.drawImage(
        video,

        cropX,
        cropY,
        cropWidth,
        cropHeight,

        0,
        0,
        width,
        height,
      );

      ctx.restore();

      /*
       * Border.
       */

      ctx.save();

      ctx.beginPath();

      ctx.roundRect(x, y, width, height, radius);

      ctx.strokeStyle = "rgba(255,255,255,0.35)";

      ctx.lineWidth = 3;

      ctx.stroke();

      ctx.restore();

      /*
       * YOU badge.
       */

      ctx.save();

      ctx.fillStyle = "rgba(0,0,0,0.72)";

      ctx.beginPath();

      ctx.roundRect(x + 14, y + height - 44, 72, 30, 15);

      ctx.fill();

      ctx.fillStyle = "#ffffff";

      ctx.font = "600 13px system-ui";

      ctx.textBaseline = "middle";

      ctx.fillText("● You", x + 25, y + height - 29);

      ctx.restore();
    },
    [],
  );

  /* =========================================================
   * PERMANENT VIDEO COMPOSITOR
   * ======================================================= */

  const ensureVideoCompositor = useCallback(async () => {
    if (compositorStartedRef.current) {
      return;
    }

    const sender = videoSenderRef.current;

    if (!sender) {
      throw new Error("Video sender is not ready.");
    }

    /*
     * Hidden camera video.
     *
     * Creating this does NOT
     * request camera permission.
     */

    const cameraVideo = document.createElement("video");

    cameraVideo.autoplay = true;

    cameraVideo.muted = true;

    cameraVideo.playsInline = true;

    cameraVideoRef.current = cameraVideo;

    if (cameraStreamRef.current) {
      cameraVideo.srcObject = cameraStreamRef.current;

      try {
        await cameraVideo.play();
      } catch {
        // Ignore.
      }
    }

    /*
     * Hidden screen video.
     */

    const screenVideo = document.createElement("video");

    screenVideo.autoplay = true;

    screenVideo.muted = true;

    screenVideo.playsInline = true;

    screenVideoRef.current = screenVideo;

    if (screenStreamRef.current) {
      screenVideo.srcObject = screenStreamRef.current;

      try {
        await screenVideo.play();
      } catch {
        // Ignore.
      }
    }

    /*
     * Permanent 16:9 output.
     */

    const canvas = document.createElement("canvas");

    canvas.width = 1280;
    canvas.height = 720;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas is unavailable.");
    }

    /*
     * ===============================================
     * PERMANENT DRAW LOOP
     * ===============================================
     *
     * Drawing order:
     *
     * 1. Black
     * 2. Screen if sharing
     * 3. Camera PiP if camera ON
     *
     * This guarantees:
     *
     * Camera only:
     * black + PiP
     *
     * Screen only:
     * screen
     *
     * Screen + camera:
     * screen + PiP
     */

    const draw = () => {
      /*
       * VERY IMPORTANT:
       *
       * clear every frame so an
       * old screen-share frame can
       * never remain after sharing
       * stops.
       */

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#000000";

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentCamera = cameraVideoRef.current;

      const currentScreen = screenVideoRef.current;

      const screenReady = Boolean(
        sharingRef.current &&
        currentScreen &&
        currentScreen.srcObject &&
        currentScreen.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        currentScreen.videoWidth > 0 &&
        currentScreen.videoHeight > 0,
      );

      const cameraReady = Boolean(
        cameraOnRef.current &&
        currentCamera &&
        currentCamera.srcObject &&
        currentCamera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        currentCamera.videoWidth > 0 &&
        currentCamera.videoHeight > 0,
      );

      /*
       * SCREEN = MAIN CONTENT
       */

      if (screenReady && currentScreen) {
        drawScreen(ctx, currentScreen, canvas);
      }

      /*
       * CAMERA = ALWAYS PIP
       */

      if (cameraReady && currentCamera) {
        drawCameraPip(ctx, currentCamera, canvas);
      }

      canvasAnimationRef.current = requestAnimationFrame(draw);
    };

    draw();

    /*
     * One permanent WebRTC
     * video track.
     */

    const canvasStream = canvas.captureStream(30);

    canvasStreamRef.current = canvasStream;

    const track = canvasStream.getVideoTracks()[0];

    if (!track) {
      throw new Error("Canvas video track unavailable.");
    }

    await sender.replaceTrack(track);

    compositorStartedRef.current = true;

    console.log("[Video] compositor started");
  }, [drawCameraPip, drawScreen]);

  /* =========================================================
   * ATTACH CAMERA
   * ======================================================= */

  const attachCamera = useCallback(async () => {
    const video = cameraVideoRef.current;

    const stream = cameraStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    try {
      await video.play();
    } catch {
      // Ignore.
    }
  }, []);

  /* =========================================================
   * ATTACH SCREEN
   * ======================================================= */

  const attachScreen = useCallback(async () => {
    const video = screenVideoRef.current;

    const stream = screenStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    try {
      await video.play();
    } catch {
      // Ignore.
    }
  }, []);

  /* =========================================================
   * STOP SCREEN SHARING
   * ======================================================= */

  const stopScreenSharing = useCallback(async () => {
    if (!sharingRef.current && !screenStreamRef.current) {
      return;
    }

    console.log("[Video] stopping screen share");

    /*
     * FIRST:
     *
     * Turn sharing off.
     *
     * The compositor immediately
     * stops drawing the screen.
     */

    sharingRef.current = false;

    setSharing(false);

    /*
     * Remove native screen capture.
     */

    const screenStream = screenStreamRef.current;

    screenStreamRef.current = null;

    screenStream?.getTracks().forEach((track) => {
      track.onended = null;

      track.stop();
    });

    /*
     * Completely detach the
     * old screen video.
     */

    const screenVideo = screenVideoRef.current;

    if (screenVideo) {
      screenVideo.pause();

      screenVideo.srcObject = null;

      screenVideo.removeAttribute("src");

      screenVideo.load();
    }

    /*
     * Restore normal microphone
     * configuration.
     */

    await rebuildOutgoingAudio(false);

    /*
     * Camera remains independent.
     *
     * Camera ON:
     * keep remote video visible.
     *
     * Camera OFF:
     * hide remote video.
     */

    sendVideoState(cameraOnRef.current);

    socket.emit("screen-share-stopped", {
      roomId,
    });
  }, [rebuildOutgoingAudio, roomId, sendVideoState, socket]);

  /* =========================================================
   * WEBRTC + SOCKET
   * ======================================================= */

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    let isCaller = false;
    let restartAttempted = false;

    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
          ],
        },
      ],

      iceTransportPolicy: "all",
    });

    peerRef.current = peer;

    /*
     * Remote stream.
     */

    remoteStreamRef.current = new MediaStream();

    /*
     * Persistent video sender.
     */

    const videoTransceiver = peer.addTransceiver("video", {
      direction: "sendrecv",
    });

    videoSenderRef.current = videoTransceiver.sender;

    /*
     * Persistent audio sender.
     */

    const audioTransceiver = peer.addTransceiver("audio", {
      direction: "sendrecv",
    });

    audioSenderRef.current = audioTransceiver.sender;

    /* =====================================================
     * REMOTE TRACK
     * =================================================== */

    peer.ontrack = (event) => {
      if (disposed) {
        return;
      }

      const stream = remoteStreamRef.current;

      if (!stream) {
        return;
      }

      const exists = stream
        .getTracks()
        .some((track) => track.id === event.track.id);

      if (!exists) {
        stream.addTrack(event.track);
      }

      attachRemoteStream();

      event.track.onunmute = () => {
        attachRemoteStream();
      };

      event.track.onended = () => {
        stream.removeTrack(event.track);
      };
    };

    /* =====================================================
     * LOCAL ICE
     * =================================================== */

    peer.onicecandidate = (event) => {
      if (disposed || !event.candidate) {
        return;
      }

      socket.emit("ice-candidate", {
        roomId,

        candidate: event.candidate.toJSON(),
      });
    };

    peer.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE:", peer.iceConnectionState);
    };

    peer.onconnectionstatechange = () => {
      if (disposed) {
        return;
      }

      const state = peer.connectionState;

      console.log("[WebRTC] connection:", state);

      setWebRtcConnected(state === "connected");

      if (state === "connected") {
        restartAttempted = false;
      }

      /*
       * One ICE restart attempt.
       */

      if (state === "failed" && isCaller && !restartAttempted) {
        restartAttempted = true;

        console.warn("[WebRTC] restarting ICE");

        void createOffer(true);
      }
    };

    /* =====================================================
     * PENDING ICE
     * =================================================== */

    const flushCandidates = async () => {
      if (!peer.remoteDescription) {
        return;
      }

      const queued = [...pendingCandidatesRef.current];

      pendingCandidatesRef.current = [];

      for (const candidate of queued) {
        try {
          await peer.addIceCandidate(candidate);
        } catch {
          // Ignore stale candidate.
        }
      }
    };

    /* =====================================================
     * CREATE OFFER
     * =================================================== */

    const createOffer = async (iceRestart = false) => {
      if (disposed || !isCaller) {
        return;
      }

      if (peer.signalingState !== "stable") {
        return;
      }

      try {
        const offer = await peer.createOffer({
          iceRestart,
        });

        await peer.setLocalDescription(offer);

        if (!peer.localDescription) {
          return;
        }

        socket.emit("offer", {
          roomId,

          offer: peer.localDescription,
        });
      } catch (error) {
        console.warn("[WebRTC] offer error:", error);
      }
    };

    /* =====================================================
     * ROOM JOINED
     * =================================================== */

    const handleRoomJoined = ({ isFirstUser }: { isFirstUser: boolean }) => {
      isCaller = isFirstUser;

      if (isFirstUser) {
        partnerConnectedRef.current = false;

        setPartnerConnected(false);

        return;
      }

      partnerConnectedRef.current = true;

      setPartnerConnected(true);

      sendVideoState(cameraOnRef.current || sharingRef.current);
    };

    /* =====================================================
     * PARTNER JOINED
     * =================================================== */

    const handleUserJoined = async () => {
      isCaller = true;

      partnerConnectedRef.current = true;

      setPartnerConnected(true);

      setJoinNotification(true);

      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }

      joinTimeoutRef.current = setTimeout(() => {
        setJoinNotification(false);
      }, 4000);

      /*
       * Let second browser finish
       * attaching listeners.
       */

      await new Promise((resolve) => window.setTimeout(resolve, 100));

      await createOffer(false);

      sendVideoState(cameraOnRef.current || sharingRef.current);
    };

    /* =====================================================
     * RECEIVE OFFER
     * =================================================== */

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      if (disposed) {
        return;
      }

      try {
        if (peer.signalingState !== "stable") {
          return;
        }

        await peer.setRemoteDescription(offer);

        await flushCandidates();

        const answer = await peer.createAnswer();

        await peer.setLocalDescription(answer);

        if (!peer.localDescription) {
          return;
        }

        socket.emit("answer", {
          roomId,

          answer: peer.localDescription,
        });
      } catch (error) {
        console.warn("[WebRTC] offer handling:", error);
      }
    };

    /* =====================================================
     * RECEIVE ANSWER
     * =================================================== */

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      if (disposed) {
        return;
      }

      if (peer.signalingState !== "have-local-offer") {
        return;
      }

      try {
        await peer.setRemoteDescription(answer);

        await flushCandidates();
      } catch (error) {
        console.warn("[WebRTC] answer:", error);
      }
    };

    /* =====================================================
     * REMOTE ICE
     * =================================================== */

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (disposed) {
        return;
      }

      if (!peer.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);

        return;
      }

      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // Ignore stale candidate.
      }
    };

    /* =====================================================
     * VIDEO STATE
     * =================================================== */

    const handleVideoState = ({ active }: { active: boolean }) => {
      setRemoteVideoAvailable(active);

      if (active) {
        window.setTimeout(() => {
          attachRemoteStream();
        }, 50);
      }
    };

    /* =====================================================
     * USER LEFT
     * =================================================== */

    const handleUserLeft = () => {
      partnerConnectedRef.current = false;

      setPartnerConnected(false);

      setWebRtcConnected(false);

      setRemoteVideoAvailable(false);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      const stream = remoteStreamRef.current;

      stream?.getTracks().forEach((track) => {
        stream.removeTrack(track);
      });
    };

    /* =====================================================
     * CHAT
     * =================================================== */

    const handleChatMessage = ({
      message: incomingMessage,
    }: {
      message: string;
    }) => {
      setMessages((current) => [
        ...current,

        {
          id: crypto.randomUUID(),

          text: incomingMessage,

          sender: "partner",
        },
      ]);

      setPopupMessage(incomingMessage);

      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      popupTimeoutRef.current = setTimeout(() => {
        setPopupMessage(null);
      }, 5000);
    };

    /* =====================================================
     * LOVE
     * =================================================== */

    const handleLove = () => {
      setLoveNotification(true);

      if (loveTimeoutRef.current) {
        clearTimeout(loveTimeoutRef.current);
      }

      loveTimeoutRef.current = setTimeout(() => {
        setLoveNotification(false);
      }, 2200);
    };

    /* =====================================================
     * ROOM FULL
     * =================================================== */

    const handleRoomFull = () => {
      alert("This room already has two people.");

      window.location.href = "/";
    };

    /* =====================================================
     * SOCKET LISTENERS
     * =================================================== */

    socket.on("room-joined", handleRoomJoined);

    socket.on("user-joined", handleUserJoined);

    socket.on("offer", handleOffer);

    socket.on("answer", handleAnswer);

    socket.on("ice-candidate", handleIceCandidate);

    socket.on("video-state", handleVideoState);

    socket.on("user-left", handleUserLeft);

    socket.on("chat-message", handleChatMessage);

    socket.on("receive-love", handleLove);

    socket.on("room-full", handleRoomFull);

    /* =====================================================
     * JOIN ROOM
     * =================================================== */

    const joinRoom = () => {
      socket.emit("join-room", roomId);
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);

      socket.connect();
    }

    /* =====================================================
     * CLEANUP
     * =================================================== */

    return () => {
      disposed = true;

      socket.off("connect", joinRoom);

      socket.off("room-joined", handleRoomJoined);

      socket.off("user-joined", handleUserJoined);

      socket.off("offer", handleOffer);

      socket.off("answer", handleAnswer);

      socket.off("ice-candidate", handleIceCandidate);

      socket.off("video-state", handleVideoState);

      socket.off("user-left", handleUserLeft);

      socket.off("chat-message", handleChatMessage);

      socket.off("receive-love", handleLove);

      socket.off("room-full", handleRoomFull);

      if (socket.connected) {
        socket.emit("leave-room", roomId);
      }

      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }

      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      if (loveTimeoutRef.current) {
        clearTimeout(loveTimeoutRef.current);
      }

      cameraStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      micStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      screenStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;

        track.stop();
      });

      if (canvasAnimationRef.current !== null) {
        cancelAnimationFrame(canvasAnimationRef.current);

        canvasAnimationRef.current = null;
      }

      canvasStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }

      void closeAudioContext();

      peer.close();

      peerRef.current = null;

      videoSenderRef.current = null;

      audioSenderRef.current = null;

      remoteStreamRef.current = null;

      cameraStreamRef.current = null;

      micStreamRef.current = null;

      screenStreamRef.current = null;

      canvasStreamRef.current = null;

      cameraVideoRef.current = null;

      screenVideoRef.current = null;

      compositorStartedRef.current = false;

      pendingCandidatesRef.current = [];

      partnerConnectedRef.current = false;

      cameraOnRef.current = false;

      micOnRef.current = false;

      sharingRef.current = false;
    };
  }, [
    attachRemoteStream,
    closeAudioContext,
    enabled,
    roomId,
    sendVideoState,
    socket,
  ]);

  /* =========================================================
   * CAMERA
   * ======================================================= */

  const toggleCamera = useCallback(async () => {
    /*
     * First camera activation.
     */

    if (!cameraStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },

            facingMode: "user",
          },

          audio: false,
        });

        cameraStreamRef.current = stream;

        setLocalStream(stream);

        const track = stream.getVideoTracks()[0];

        if (!track) {
          throw new Error("Camera unavailable.");
        }

        track.enabled = true;

        cameraOnRef.current = true;

        setCameraOn(true);

        /*
         * Start permanent output
         * canvas if necessary.
         */

        await ensureVideoCompositor();

        /*
         * Attach camera source.
         */

        await attachCamera();

        /*
         * Girlfriend should now
         * display our outgoing canvas.
         */

        sendVideoState(true);

        return;
      } catch (error) {
        console.warn("Camera failed:", error);

        alert("Please allow camera access.");

        return;
      }
    }

    /*
     * Camera already exists.
     */

    const track = cameraStreamRef.current.getVideoTracks()[0];

    if (!track) {
      return;
    }

    const next = !cameraOnRef.current;

    track.enabled = next;

    cameraOnRef.current = next;

    setCameraOn(next);

    /*
     * Camera turned back ON.
     */

    if (next) {
      await ensureVideoCompositor();

      await attachCamera();

      /*
       * Explicitly restart playback
       * after screen-sharing changes.
       */

      const cameraVideo = cameraVideoRef.current;

      if (cameraVideo && cameraStreamRef.current) {
        cameraVideo.srcObject = cameraStreamRef.current;

        try {
          await cameraVideo.play();
        } catch {
          // Ignore.
        }
      }
    }

    /*
     * If screen sharing is active,
     * video remains visible regardless
     * of camera state.
     */

    sendVideoState(sharingRef.current || next);
  }, [attachCamera, ensureVideoCompositor, sendVideoState]);

  /* =========================================================
   * MICROPHONE
   * ======================================================= */

  const toggleMicrophone = useCallback(async () => {
    if (!micStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        micStreamRef.current = stream;

        const track = stream.getAudioTracks()[0];

        if (!track) {
          throw new Error("Microphone unavailable.");
        }

        track.enabled = true;

        micOnRef.current = true;

        setMicOn(true);

        await rebuildOutgoingAudio(sharingRef.current);

        return;
      } catch (error) {
        console.warn("Microphone failed:", error);

        alert("Please allow microphone access.");

        return;
      }
    }

    const track = micStreamRef.current.getAudioTracks()[0];

    if (!track) {
      return;
    }

    track.enabled = !track.enabled;

    micOnRef.current = track.enabled;

    setMicOn(track.enabled);

    await rebuildOutgoingAudio(sharingRef.current);
  }, [rebuildOutgoingAudio]);

  /* =========================================================
   * SCREEN SHARE
   * ======================================================= */

  const shareScreen = useCallback(async () => {
    /*
     * Click again = stop.
     */

    if (sharingRef.current) {
      await stopScreenSharing();

      return;
    }

    try {
      /*
       * IMPORTANT:
       *
       * Screen sharing never opens
       * or enables the camera.
       */

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: {
            ideal: 30,
            max: 30,
          },
        },

        audio: true,
      });

      screenStreamRef.current = screenStream;

      /*
       * Start output canvas if
       * this is our first video.
       */

      await ensureVideoCompositor();

      /*
       * Attach screen.
       */

      await attachScreen();

      /*
       * Camera stays independent.
       *
       * Attach it only if it was
       * already enabled.
       */

      if (cameraOnRef.current && cameraStreamRef.current) {
        await attachCamera();
      }

      /*
       * Screen becomes main layer.
       */

      sharingRef.current = true;

      setSharing(true);

      /*
       * Screen audio +
       * microphone when enabled.
       */

      await rebuildOutgoingAudio(true);

      /*
       * Remote video visible.
       */

      sendVideoState(true);

      /*
       * Native browser
       * Stop Sharing button.
       */

      const screenTrack = screenStream.getVideoTracks()[0];

      if (screenTrack) {
        screenTrack.onended = () => {
          void stopScreenSharing();
        };
      }
    } catch (error) {
      console.warn("Screen sharing cancelled:", error);

      /*
       * Only clean screen state.
       *
       * Camera must not change.
       */

      const failedScreen = screenStreamRef.current;

      screenStreamRef.current = null;

      failedScreen?.getTracks().forEach((track) => {
        track.onended = null;

        track.stop();
      });

      const screenVideo = screenVideoRef.current;

      if (screenVideo) {
        screenVideo.pause();

        screenVideo.srcObject = null;

        screenVideo.removeAttribute("src");

        screenVideo.load();
      }

      sharingRef.current = false;

      setSharing(false);

      await rebuildOutgoingAudio(false);

      sendVideoState(cameraOnRef.current);
    }
  }, [
    attachCamera,
    attachScreen,
    ensureVideoCompositor,
    rebuildOutgoingAudio,
    sendVideoState,
    stopScreenSharing,
  ]);

  /* =========================================================
   * CHAT
   * ======================================================= */

  const sendMessage = useCallback(() => {
    const text = message.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,

      {
        id: crypto.randomUUID(),

        text,

        sender: "me",
      },
    ]);

    socket.emit("chat-message", {
      roomId,
      message: text,
    });

    setMessage("");
  }, [message, roomId, socket]);

  /* =========================================================
   * LOVE
   * ======================================================= */

  const sendLove = useCallback(() => {
    socket.emit("send-love", {
      roomId,
    });
  }, [roomId, socket]);

  /* =========================================================
   * RETURN
   * ======================================================= */

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
