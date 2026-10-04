import type { ReactNode } from "react";

export function LoginLayoutClassic({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen login-layout login-layout--classic">
      <div className="auth-card glass stack login-layout__card">{children}</div>
    </div>
  );
}
