import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/membership/server", () => ({ getMembershipSession: mocks.session }));
vi.mock("@/app/auth/actions", () => ({ loginMember: vi.fn(), signupMember: vi.fn(), requestPasswordReset: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error("REDIRECT:" + path); } }));
import LoginPage from "@/app/(auth)/login/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import SignupCompletePage from "@/app/(auth)/signup/complete/page";
import { SignupForm } from "@/components/membership/SignupForm";

beforeEach(() => mocks.session.mockResolvedValue({ user: null, profile: null, isAdmin: false }));
afterEach(cleanup);

describe("email-only auth screens", () => {
  it("renders a single email login identifier with password-manager support", async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByLabelText("이메일")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("이메일")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("이메일")).toHaveAttribute("autocomplete", "username");
    expect(container.querySelector('input[name="username"]')).toBeNull();
    expect(screen.queryByLabelText(/아이디/)).not.toBeInTheDocument();
  });
  it("does not ask new members to choose an ID", () => {
    render(<SignupForm catalog={{ schools: [], classes: [], clubs: [], settings: {
      signup_open: true, consent_version: "unit-v1", privacy_url: "https://example.com/privacy",
    } }} />);
    expect(screen.getByLabelText("이메일")).toBeRequired();
    expect(screen.queryByLabelText(/아이디/)).not.toBeInTheDocument();
    expect(screen.getByText(/로그인, 가입 인증과 비밀번호 재설정/)).toBeInTheDocument();
  });
  it("keeps recovery on the same email identifier", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("이메일")).toHaveAttribute("type", "email");
    expect(screen.getByText(/로그인에 사용하는 이메일/)).toBeInTheDocument();
  });
  it("does not send existing members back to username login", () => {
    render(<SignupCompletePage />);
    expect(screen.getByText(/해당 이메일로 로그인/)).toBeInTheDocument();
    expect(screen.queryByText(/기존 아이디/)).not.toBeInTheDocument();
  });
  it("redirects an existing administrator to their protected area", async () => {
    mocks.session.mockResolvedValue({ user: { id: "admin" }, profile: null, isAdmin: true });
    await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/admin");
  });
});
