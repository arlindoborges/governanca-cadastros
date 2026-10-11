const REMEMBER_KEY = "gc_remember_user";
const EMAIL_KEY = "gc_remembered_email";

export function loadRememberedEmail(): { remember: boolean; email: string } {
  if (typeof window === "undefined") {
    return { remember: false, email: "" };
  }
  const remember = localStorage.getItem(REMEMBER_KEY) === "1";
  const email = remember ? (localStorage.getItem(EMAIL_KEY) ?? "") : "";
  return { remember, email };
}

export function persistRememberedEmail(remember: boolean, email: string) {
  if (typeof window === "undefined") return;
  if (remember && email.trim()) {
    localStorage.setItem(REMEMBER_KEY, "1");
    localStorage.setItem(EMAIL_KEY, email.trim());
    return;
  }
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
