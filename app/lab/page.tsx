import type { Metadata } from "next";
import HoldemLabQuiz from "@/components/lab/HoldemLabQuiz";

export const metadata: Metadata = {
  title: "홀덤연구소 | DO:NUTS",
  description: "도너츠 홀덤연구소 — GTO 퀴즈로 실력을 점검해보세요.",
};

export default function LabPage() {
  return <HoldemLabQuiz />;
}
