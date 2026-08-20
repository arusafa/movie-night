import MovieRoom from "@/components/movie-night/MovieRoom";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return <MovieRoom roomId={roomId} />;
}
