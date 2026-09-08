import { redirect } from "next/navigation";

// The member home will replace this temporary entry point.
export default function HomePage() {
  redirect("/schedule");
}
