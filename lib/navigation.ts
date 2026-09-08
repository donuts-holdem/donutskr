import type { HeaderTab } from "@/lib/site/types";

// Public routes retained while the member application is developed.
export const PUBLIC_NAVIGATION: HeaderTab[] = [
  { label: "일정", href: "/schedule", external: false, mobileHidden: false },
  { label: "시리즈", href: "/series", external: false, mobileHidden: false },
];
