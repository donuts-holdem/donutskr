import { MyMeetings } from "@/components/meetings/MyMeetings";
import { MyLearning } from "@/components/learning/MyLearning";
import { getMyMeetingHistory } from "@/app/meetings/history";

export default async function MyActivityLayout({ children }: { children: React.ReactNode }) {
  const history = await getMyMeetingHistory();
  return <>{children}<MyMeetings initial={history} /><MyLearning /></>;
}
