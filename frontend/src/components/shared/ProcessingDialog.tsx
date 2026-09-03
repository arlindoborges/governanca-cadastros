"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  processed?: number;
  total?: number;
  percent?: number;
};

export function ProcessingDialog({
  open,
  title,
  message,
  processed = 0,
  total = 0,
  percent = 0,
}: Props) {
  if (!open) {
    return null;
  }

  const hasTotal = total > 0;
  const displayPercent = hasTotal ? percent : null;

  return (
    <div className="processing-overlay" role="dialog" aria-modal="true" aria-labelledby="processing-title">
      <div className="processing-dialog">
        <h3 id="processing-title" className="processing-dialog__title">
          {title}
        </h3>
        <p className="processing-dialog__message">{message}</p>
        <div
          className={`progress-bar${hasTotal ? "" : " progress-bar--indeterminate"}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayPercent ?? undefined}
          aria-label="Progresso do processamento"
        >
          <div
            className="progress-bar__fill"
            style={hasTotal ? { width: `${displayPercent}%` } : undefined}
          />
        </div>
        {hasTotal ? (
          <p className="processing-dialog__meta">
            {processed.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}
            {displayPercent !== null ? ` · ${displayPercent}%` : null}
          </p>
        ) : (
          <p className="processing-dialog__meta">Aguarde, isso pode levar alguns minutos...</p>
        )}
      </div>
    </div>
  );
}
