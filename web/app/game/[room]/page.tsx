import PlanckGame from "@/components/game";

export default function GameRoom({ params }: { params: { room: string } }) {
  return <PlanckGame room={params.room} />;
}
