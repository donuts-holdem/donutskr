import { revalidatePath } from "next/cache";

export function revalidatePublic(paths: string[] = []) {
  ["/", "/schedule", "/online-league", "/leaderboard", ...paths].forEach((p) =>
    revalidatePath(p),
  );
}
