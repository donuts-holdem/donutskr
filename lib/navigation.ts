import type { HeaderTab } from "@/lib/site/types";

// The public landing and member services share one navigation across the app.
export const APP_NAVIGATION: HeaderTab[] = [
  { label: "클래스", href: "/class", external: false, mobileHidden: false },
  { label: "클럽", href: "/club", external: false, mobileHidden: false },
  { label: "모임", href: "/meetings", external: false, mobileHidden: false },
  { label: "학습", href: "/learn", external: false, mobileHidden: false },
  { label: "파트너", href: "/partners", external: false, mobileHidden: false },
  { label: "회원 홈", href: "/home", external: false, mobileHidden: false },
];

export const PERSONAL_NAVIGATION: HeaderTab[] = [
  { label: "알림", href: "/notifications", external: false, mobileHidden: false },
  { label: "MY", href: "/my", external: false, mobileHidden: false },
];
