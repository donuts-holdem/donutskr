import { revalidatePath } from "next/cache";

export function revalidatePublic(paths: string[] = []) {
  new Set(["/", "/series", "/schedule", ...paths]).forEach((path) =>
    revalidatePath(path),
  );
}
