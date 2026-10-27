// Test route for the island scene (3 dragons + skills). The real game page is /play.
import IslandLoader from '@/components/dev/IslandLoader';

export const metadata = { title: "Thử đảo" };

export default function DevIslandPage() {
  return <IslandLoader />;
}
