import type { HeaderTab } from "@/lib/site/types";

// Public content and member services share one navigation across the app.
export const PUBLIC_NAVIGATION: HeaderTab[] = [
  { label: "일정", href: "/schedule", external: false, mobileHidden: false },
  { label: "시리즈", href: "/series", external: false, mobileHidden: false },
];

export const MEMBER_NAVIGATION: HeaderTab[] = [
  { label: "클래스", href: "/class", external: false, mobileHidden: false },
  { label: "클럽", href: "/club", external: false, mobileHidden: false },
  { label: "모임", href: "/meetings", external: false, mobileHidden: false },
  { label: "학습", href: "/learn", external: false, mobileHidden: false },
  { label: "회원 홈", href: "/home", external: false, mobileHidden: false },
];

export const APP_NAVIGATION: HeaderTab[] = [
  ...PUBLIC_NAVIGATION,
  ...MEMBER_NAVIGATION,
];

export const PERSONAL_NAVIGATION: HeaderTab[] = [
  { label: "알림", href: "/notifications", external: false, mobileHidden: false },
  { label: "MY · 내 활동", href: "/my", external: false, mobileHidden: false },
];
