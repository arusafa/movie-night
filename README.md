# Movie Night 💕

A private two-person movie night web app built with Next.js, Socket.IO, and WebRTC.

The app is designed for two people to join the same room, chat, send reactions, use camera and microphone, and share a desktop screen while keeping camera video separate from screen sharing.

## Features

- Private two-person rooms
- WebRTC camera and microphone
- Independent screen sharing
- Partner camera as the main video
- Local camera preview in the bottom-left
- Remote camera picture-in-picture when the remote user shares their screen
- Real-time private chat
- Incoming message popup
- Love/reaction animations
- Responsive desktop and iPhone layout
- iPhone camera, microphone, chat, and remote screen viewing
- Railway-hosted Socket.IO signaling server
- Vercel-hosted Next.js frontend

## Video Layout

### Normal camera mode

```text
┌─────────────────────────────────┐
│                                 │
│        PARTNER CAMERA           │
│          BIG / MAIN             │
│                                 │
│ ┌─────────┐                     │
│ │ MY CAM  │                     │
│ └─────────┘                     │
└─────────────────────────────────┘
```

### Screen sharing mode

```text
┌─────────────────────────────────┐
│                                 │
│         PARTNER SCREEN          │
│          BIG / MAIN             │
│                        ┌───────┐ │
│ ┌─────────┐            │ THEIR │ │
│ │ MY CAM  │            │ CAM   │ │
│ └─────────┘            └───────┘ │
└─────────────────────────────────┘
```

The local camera remains in the bottom-left. When the partner shares their screen, their screen becomes the main view and their camera becomes a bottom-right picture-in-picture.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Socket.IO
- WebRTC
- Vercel
- Railway

## Project Structure

```text
movie-night/
├── socket-server.js
├── package.json
├── .env.local
└── src/
    ├── app/
    │   └── room/
    │       └── [roomId]/
    │           └── page.tsx
    ├── components/
    │   ├── ChatPanel.tsx
    │   ├── IncomingMessagePopup.tsx
    │   └── movie-night/
    │       ├── CameraPreview.tsx
    │       ├── MovieRoom.tsx
    │       └── MovieStage.tsx
    ├── hooks/
    │   └── useMovieRoom.ts
    └── lib/
        └── socket.ts
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

Start the Next.js frontend:

```bash
npm run dev
```

In a second terminal, start the Socket.IO signaling server:

```bash
npm run socket
```

The frontend runs at:

```text
http://localhost:3000
```

The local signaling server runs at:

```text
http://localhost:3001
```

## Required Scripts

Make sure `package.json` includes:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "socket": "node socket-server.js",
    "socket:start": "node socket-server.js"
  }
}
```

## Environment Variables

### Vercel

Set:

```text
NEXT_PUBLIC_SOCKET_URL
```

Example:

```text
https://movie-night-production-dd12.up.railway.app
```

### Railway

Set:

```text
CLIENT_ORIGINS
```

Example:

```text
https://movie-night-fawn-zeta.vercel.app
```

For multiple allowed frontend origins, use a comma-separated list.

## Deployment

### Frontend — Vercel

The Next.js frontend is deployed on Vercel.

After pushing to GitHub, Vercel can redeploy automatically.

### Signaling Server — Railway

The Socket.IO signaling server is deployed separately on Railway.

Railway should run:

```bash
npm run socket:start
```

A health endpoint is available at:

```text
/health
```

Example:

```text
https://movie-night-production-dd12.up.railway.app/health
```

Expected response:

```json
{
  "ok": true,
  "service": "movie-night-socket"
}
```

## How the Connection Works

```text
Vercel Frontend
      │
      │ Socket.IO / WebSocket
      ▼
Railway Signaling Server
      │
      │ offer / answer / ICE
      ▼
WebRTC Peer Connection
      │
      ├── camera video
      ├── screen video
      └── audio
```

Socket.IO is only used for signaling, room state, chat, and reactions. Camera, microphone, and screen media are sent through WebRTC.

## iPhone Support

On iPhone, the app supports:

- Joining a room
- Receiving partner video
- Receiving a shared desktop screen
- Camera
- Microphone
- Chat
- Reactions

Starting screen sharing from an iPhone browser may not be available because iOS browsers generally do not expose the same browser screen-sharing API as desktop browsers.

When screen sharing is unavailable, the screen-share button is disabled.

## WebRTC Notes

The current WebRTC setup uses public STUN servers.

Some users or networks may require a TURN server, especially when:

- Both users are behind restrictive NAT
- Corporate or school networks block peer-to-peer traffic
- VPNs interfere with ICE connectivity
- Mobile carrier networks prevent direct peer connections

If the room connects through Socket.IO but WebRTC remains stuck on `Connecting...`, adding a TURN server is the next step.

## Troubleshooting

### Socket.IO does not connect

Check the browser console.

The production connection should point to Railway:

```text
wss://your-railway-domain.up.railway.app/socket.io/
```

not the Vercel domain.

Verify:

```text
NEXT_PUBLIC_SOCKET_URL
```

is configured in Vercel and then redeploy.

### Railway `/health` returns 404

Railway is probably starting Next.js instead of `socket-server.js`.

Set the Railway start command to:

```bash
npm run socket:start
```

### CORS / origin errors

Make sure Railway has:

```text
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
```

### Camera works locally but not remotely

Check:

- Both users show `Connected`
- Camera permission is allowed
- WebRTC ICE reaches the `connected` state
- No VPN is blocking WebRTC
- TURN may be required on restrictive networks

### Screen share looks too small

The shared screen should be rendered as the main remote screen. Depending on the selected display aspect ratio, `object-cover` may crop some edges while filling the entire player.

## Security / Privacy Notes

This project is intended for private two-person rooms.

For a production-hardened version, consider adding:

- Stronger room authentication
- Expiring room tokens
- Rate limiting
- Message validation
- TURN authentication
- HTTPS-only enforcement
- Better reconnection handling
- Server-side room authorization

## License

Private project.
