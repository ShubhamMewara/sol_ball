import PlanckGame from "@/components/game";

export default async function GameRoom({
  params,
}: {
  params: Promise<{
    room: string;
  }>;
}) {
  const { room } = await params;

  return <PlanckGame room={room} />;
}
