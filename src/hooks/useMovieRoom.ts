"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSocket } from "@/lib/socket";

import type { ChatMessage } from "@/components/ChatPanel";

interface UseMovieRoomOptions {
  roomId: string;
  enabled: boolean;
}

interface RemoteMediaState {
  camera: boolean;
  screen: boolean;
}

export function useMovieRoom({ roomId, enabled }: UseMovieRoomOptions) {
  const socket = getSocket();

  /* =========================================================
   * UI STATE
   * ======================================================= */

  const [partnerConnected, setPartnerConnected] = useState(false);

  const [webRtcConnected, setWebRtcConnected] = useState(false);

  const [remoteCameraAvailable, setRemoteCameraAvailable] = useState(false);

  const [remoteScreenAvailable, setRemoteScreenAvailable] = useState(false);

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

  /*
   * We create THREE permanent WebRTC
   * transceivers:
   *
   * 1. Camera video
   * 2. Screen video
   * 3. Audio
   */

  const cameraTransceiverRef = useRef<RTCRtpTransceiver | null>(null);

  const screenTransceiverRef = useRef<RTCRtpTransceiver | null>(null);

  const audioTransceiverRef = useRef<RTCRtpTransceiver | null>(null);

  const cameraSenderRef = useRef<RTCRtpSender | null>(null);

  const screenSenderRef = useRef<RTCRtpSender | null>(null);

  const audioSenderRef = useRef<RTCRtpSender | null>(null);

  /* =========================================================
   * REMOTE CAMERA
   * ======================================================= */

  const remoteCameraVideoRef = useRef<HTMLVideoElement | null>(null);

  const remoteCameraStreamRef = useRef<MediaStream | null>(null);

  /* =========================================================
   * REMOTE SCREEN
   * ======================================================= */

  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);

  const remoteScreenStreamRef = useRef<MediaStream | null>(null);

  /* =========================================================
   * LOCAL MEDIA
   * ======================================================= */

  const cameraStreamRef = useRef<MediaStream | null>(null);

  const microphoneStreamRef = useRef<MediaStream | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);

  /* =========================================================
   * AUDIO MIXER
   * ======================================================= */

  const audioContextRef = useRef<AudioContext | null>(null);

  /* =========================================================
   * LIVE STATE REFS
   * ======================================================= */

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
   * ATTACH REMOTE CAMERA
   * ======================================================= */

  const attachRemoteCamera = useCallback(() => {
    const video = remoteCameraVideoRef.current;

    const stream = remoteCameraStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch(() => {});
  }, []);

  /* =========================================================
   * ATTACH REMOTE SCREEN
   * ======================================================= */

  const attachRemoteScreen = useCallback(() => {
    const video = remoteScreenVideoRef.current;

    const stream = remoteScreenStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch(() => {});
  }, []);

  /* =========================================================
   * MEDIA STATE SIGNALING
   * ======================================================= */

  const sendMediaState = useCallback(() => {
    socket.emit("media-state", {
      roomId,

      camera: cameraOnRef.current,

      screen: sharingRef.current,
    });
  }, [roomId, socket]);

  /* =========================================================
   * AUDIO
   * ======================================================= */

  const closeAudioContext = useCallback(async () => {
    const context = audioContextRef.current;

    if (!context) {
      return;
    }

    try {
      await context.close();
    } catch {}

    audioContextRef.current = null;
  }, []);

  const rebuildOutgoingAudio = useCallback(async () => {
    const sender = audioSenderRef.current;

    if (!sender) {
      return;
    }

    await closeAudioContext();

    const microphoneTrack = microphoneStreamRef.current?.getAudioTracks()[0];

    const screenAudioTrack = screenStreamRef.current?.getAudioTracks()[0];

    /*
     * Nothing.
     */

    if (!micOnRef.current && !screenAudioTrack) {
      await sender.replaceTrack(null);

      return;
    }

    /*
     * Microphone only.
     */

    if (micOnRef.current && microphoneTrack && !screenAudioTrack) {
      await sender.replaceTrack(microphoneTrack);

      return;
    }

    /*
     * Screen audio only.
     */

    if (!micOnRef.current && screenAudioTrack) {
      await sender.replaceTrack(screenAudioTrack);

      return;
    }

    /*
     * Screen audio + microphone.
     */

    if (microphoneTrack && screenAudioTrack) {
      const context = new AudioContext();

      audioContextRef.current = context;

      if (context.state === "suspended") {
        try {
          await context.resume();
        } catch {}
      }

      const destination = context.createMediaStreamDestination();

      const micSource = context.createMediaStreamSource(
        new MediaStream([microphoneTrack]),
      );

      const screenSource = context.createMediaStreamSource(
        new MediaStream([screenAudioTrack]),
      );

      micSource.connect(destination);

      screenSource.connect(destination);

      const mixedTrack = destination.stream.getAudioTracks()[0];

      await sender.replaceTrack(mixedTrack ?? null);
    }
  }, [closeAudioContext]);

  /* =========================================================
   * STOP SCREEN SHARING
   * ======================================================= */

  const stopScreenSharing = useCallback(async () => {
    if (!sharingRef.current && !screenStreamRef.current) {
      return;
    }

    console.log("[Screen] stopping");

    /*
     * State first.
     */

    sharingRef.current = false;

    setSharing(false);

    /*
     * Stop sending screen video.
     */

    try {
      await screenSenderRef.current?.replaceTrack(null);
    } catch (error) {
      console.warn("[Screen] replaceTrack(null):", error);
    }

    /*
     * Stop local display capture.
     */

    const stream = screenStreamRef.current;

    screenStreamRef.current = null;

    stream?.getTracks().forEach((track) => {
      track.onended = null;

      track.stop();
    });

    /*
     * Screen audio disappears too.
     */

    await rebuildOutgoingAudio();

    /*
     * Tell partner immediately.
     */

    sendMediaState();
  }, [rebuildOutgoingAudio, sendMediaState]);

  /* =========================================================
   * SOCKET + WEBRTC
   * ======================================================= */

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;

    let isCaller = false;

    let iceRestartAttempted = false;

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
     * =====================================================
     * CREATE PERMANENT TRANSCEIVERS
     * =====================================================
     *
     * Order matters and is the same
     * on both browsers.
     */

    const cameraTransceiver = peer.addTransceiver("video", {
      direction: "sendrecv",
    });

    cameraTransceiverRef.current = cameraTransceiver;

    cameraSenderRef.current = cameraTransceiver.sender;

    const screenTransceiver = peer.addTransceiver("video", {
      direction: "sendrecv",
    });

    screenTransceiverRef.current = screenTransceiver;

    screenSenderRef.current = screenTransceiver.sender;

    const audioTransceiver = peer.addTransceiver("audio", {
      direction: "sendrecv",
    });

    audioTransceiverRef.current = audioTransceiver;

    audioSenderRef.current = audioTransceiver.sender;

    /*
     * Separate remote streams.
     */

    remoteCameraStreamRef.current = new MediaStream();

    remoteScreenStreamRef.current = new MediaStream();

    /* =====================================================
     * REMOTE TRACK
     * =================================================== */

    peer.ontrack = (event) => {
      if (disposed) {
        return;
      }

      /*
       * CAMERA transceiver.
       */

      if (event.transceiver === cameraTransceiverRef.current) {
        const stream = remoteCameraStreamRef.current;

        if (!stream) {
          return;
        }

        const exists = stream
          .getTracks()
          .some((track) => track.id === event.track.id);

        if (!exists) {
          stream.addTrack(event.track);
        }

        attachRemoteCamera();

        event.track.onunmute = () => {
          attachRemoteCamera();
        };

        return;
      }

      /*
       * SCREEN transceiver.
       */

      if (event.transceiver === screenTransceiverRef.current) {
        const stream = remoteScreenStreamRef.current;

        if (!stream) {
          return;
        }

        const exists = stream
          .getTracks()
          .some((track) => track.id === event.track.id);

        if (!exists) {
          stream.addTrack(event.track);
        }

        attachRemoteScreen();

        event.track.onunmute = () => {
          attachRemoteScreen();
        };
      }
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

    peer.onconnectionstatechange = () => {
      if (disposed) {
        return;
      }

      const state = peer.connectionState;

      console.log("[WebRTC]", state);

      setWebRtcConnected(state === "connected");

      if (state === "connected") {
        iceRestartAttempted = false;
      }

      if (state === "failed" && isCaller && !iceRestartAttempted) {
        iceRestartAttempted = true;

        void createOffer(true);
      }
    };

    /* =====================================================
     * ICE QUEUE
     * =================================================== */

    const flushCandidates = async () => {
      if (!peer.remoteDescription) {
        return;
      }

      const candidates = [...pendingCandidatesRef.current];

      pendingCandidatesRef.current = [];

      for (const candidate of candidates) {
        try {
          await peer.addIceCandidate(candidate);
        } catch {}
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
        console.warn("[WebRTC] offer:", error);
      }
    };

    /* =====================================================
     * ROOM JOINED
     * =================================================== */

    const handleRoomJoined = ({ isFirstUser }: { isFirstUser: boolean }) => {
      isCaller = isFirstUser;

      if (isFirstUser) {
        setPartnerConnected(false);

        return;
      }

      setPartnerConnected(true);

      sendMediaState();
    };

    /* =====================================================
     * PARTNER JOINED
     * =================================================== */

    const handleUserJoined = async () => {
      isCaller = true;

      setPartnerConnected(true);

      setJoinNotification(true);

      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }

      joinTimeoutRef.current = setTimeout(() => {
        setJoinNotification(false);
      }, 4000);

      /*
       * Give second browser time
       * to finish initialization.
       */

      await new Promise((resolve) => window.setTimeout(resolve, 100));

      await createOffer(false);

      sendMediaState();
    };

    /* =====================================================
     * OFFER
     * =================================================== */

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      if (disposed) {
        return;
      }

      if (peer.signalingState !== "stable") {
        return;
      }

      try {
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
     * ANSWER
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
      } catch {}
    };

    /* =====================================================
     * REMOTE MEDIA STATE
     * =================================================== */

    const handleMediaState = ({ camera, screen }: RemoteMediaState) => {
      setRemoteCameraAvailable(Boolean(camera));

      setRemoteScreenAvailable(Boolean(screen));

      if (camera) {
        window.setTimeout(attachRemoteCamera, 50);
      }

      if (screen) {
        window.setTimeout(attachRemoteScreen, 50);
      }
    };

    /* =====================================================
     * PARTNER LEFT
     * =================================================== */

    const handleUserLeft = () => {
      setPartnerConnected(false);

      setWebRtcConnected(false);

      setRemoteCameraAvailable(false);

      setRemoteScreenAvailable(false);

      if (remoteCameraVideoRef.current) {
        remoteCameraVideoRef.current.srcObject = null;
      }

      if (remoteScreenVideoRef.current) {
        remoteScreenVideoRef.current.srcObject = null;
      }
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

    socket.on("media-state", handleMediaState);

    socket.on("user-left", handleUserLeft);

    socket.on("chat-message", handleChatMessage);

    socket.on("receive-love", handleLove);

    socket.on("room-full", handleRoomFull);

    /* =====================================================
     * JOIN
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

      socket.off("media-state", handleMediaState);

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

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());

      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());

      screenStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;

        track.stop();
      });

      void closeAudioContext();

      peer.close();

      peerRef.current = null;

      cameraSenderRef.current = null;

      screenSenderRef.current = null;

      audioSenderRef.current = null;

      cameraTransceiverRef.current = null;

      screenTransceiverRef.current = null;

      audioTransceiverRef.current = null;

      remoteCameraStreamRef.current = null;

      remoteScreenStreamRef.current = null;

      cameraStreamRef.current = null;

      microphoneStreamRef.current = null;

      screenStreamRef.current = null;

      pendingCandidatesRef.current = [];

      cameraOnRef.current = false;

      micOnRef.current = false;

      sharingRef.current = false;
    };
  }, [
    attachRemoteCamera,
    attachRemoteScreen,
    closeAudioContext,
    enabled,
    roomId,
    sendMediaState,
    socket,
  ]);

  /* =========================================================
   * CAMERA
   * ======================================================= */

  const toggleCamera = useCallback(async () => {
    const sender = cameraSenderRef.current;

    if (!sender) {
      return;
    }

    /*
     * First time.
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
          return;
        }

        track.enabled = true;

        await sender.replaceTrack(track);

        cameraOnRef.current = true;

        setCameraOn(true);

        sendMediaState();

        return;
      } catch (error) {
        console.warn("Camera failed:", error);

        alert("Please allow camera access.");

        return;
      }
    }

    const track = cameraStreamRef.current.getVideoTracks()[0];

    if (!track) {
      return;
    }

    const next = !cameraOnRef.current;

    cameraOnRef.current = next;

    setCameraOn(next);

    if (next) {
      track.enabled = true;

      await sender.replaceTrack(track);
    } else {
      await sender.replaceTrack(null);

      track.enabled = false;
    }

    sendMediaState();
  }, [sendMediaState]);

  /* =========================================================
   * MICROPHONE
   * ======================================================= */

  const toggleMicrophone = useCallback(async () => {
    if (!microphoneStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        microphoneStreamRef.current = stream;

        const track = stream.getAudioTracks()[0];

        if (!track) {
          return;
        }

        track.enabled = true;

        micOnRef.current = true;

        setMicOn(true);

        await rebuildOutgoingAudio();

        return;
      } catch (error) {
        console.warn("Microphone failed:", error);

        alert("Please allow microphone access.");

        return;
      }
    }

    const track = microphoneStreamRef.current.getAudioTracks()[0];

    if (!track) {
      return;
    }

    micOnRef.current = !micOnRef.current;

    track.enabled = micOnRef.current;

    setMicOn(micOnRef.current);

    await rebuildOutgoingAudio();
  }, [rebuildOutgoingAudio]);

  /* =========================================================
   * SCREEN SHARE
   * ======================================================= */

  const shareScreen = useCallback(async () => {
    if (sharingRef.current) {
      await stopScreenSharing();

      return;
    }

    const sender = screenSenderRef.current;

    if (!sender) {
      return;
    }

    try {
      /*
       * SCREEN ONLY.
       *
       * This does NOT touch camera.
       */

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: {
            ideal: 30,

            max: 30,
          },
        },

        audio: true,
      });

      screenStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error("Screen video unavailable.");
      }

      await sender.replaceTrack(videoTrack);

      sharingRef.current = true;

      setSharing(true);

      /*
       * Screen audio if browser
       * provides it.
       */

      await rebuildOutgoingAudio();

      sendMediaState();

      videoTrack.onended = () => {
        void stopScreenSharing();
      };
    } catch (error) {
      console.warn("Screen share cancelled:", error);

      await stopScreenSharing();
    }
  }, [rebuildOutgoingAudio, sendMediaState, stopScreenSharing]);

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

  return {
    partnerConnected,

    webRtcConnected,

    remoteCameraAvailable,

    remoteScreenAvailable,

    remoteCameraVideoRef,

    remoteScreenVideoRef,

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
