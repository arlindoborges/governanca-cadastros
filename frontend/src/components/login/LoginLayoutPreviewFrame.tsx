"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  id: string;
  children: ReactNode;
};

export function LoginLayoutPreviewFrame({ title, description, id, children }: Props) {
  return (
    <article className="login-preview-option" id={id}>
      <header className="login-preview-option__header">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </header>
      <div className="login-preview-option__frame" aria-label={`Prévia: ${title}`}>
        <div className="login-preview-option__viewport">{children}</div>
      </div>
    </article>
  );
}
