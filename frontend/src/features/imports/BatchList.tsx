import Link from "next/link";

import { DeleteImportBatchButton } from "@/features/imports/DeleteImportBatchButton";
import { ImportStatusBadge } from "@/features/imports/ImportStatusBadge";
import { type ImportBatch } from "@/features/imports/labels";
import { formatDateTime } from "@/lib/datetime";

type Props = {
  batches: ImportBatch[];
};

export function BatchList({ batches }: Props) {
  if (batches.length === 0) {
    return (
      <div className="empty-state" role="status">
        <p className="empty-state__title">Nenhum lote importado ainda</p>
        <p className="empty-state__text">Envie uma planilha XLSX para iniciar o primeiro lote.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>Lotes importados</caption>
        <thead>
          <tr>
            <th scope="col">Arquivo</th>
            <th scope="col">Status</th>
            <th scope="col">Válidas</th>
            <th scope="col">Inválidas</th>
            <th scope="col">Total</th>
            <th scope="col">Criado em</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id}>
              <td>
                <Link className="table-link" href={`/importacoes/${batch.id}`}>
                  {batch.file_name}
                </Link>
              </td>
              <td>
                <ImportStatusBadge status={batch.status} />
              </td>
              <td className="num num--ok">{batch.valid_rows}</td>
              <td className="num num--bad">{batch.invalid_rows}</td>
              <td className="num">{batch.total_rows}</td>
              <td className="table-meta">{formatDateTime(batch.created_at)}</td>
              <td>
                <DeleteImportBatchButton
                  batchId={batch.id}
                  fileName={batch.file_name}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
