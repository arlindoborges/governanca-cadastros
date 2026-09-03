import { rowIssueLabel, type ImportRowError } from "@/features/imports/labels";

type Props = {
  errors: ImportRowError[];
  total: number;
};

export function RowErrorsTable({ errors, total }: Props) {
  if (total === 0) {
    return (
      <div className="empty-state empty-state--compact" role="status">
        <p className="empty-state__title">Nenhuma linha inválida neste lote</p>
        <p className="empty-state__text">Todas as linhas passaram na validação cadastral.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{`${total} linha(s) inválida(s)`}</caption>
        <thead>
          <tr>
            <th scope="col">Linha</th>
            <th scope="col">Código</th>
            <th scope="col">Descrição</th>
            <th scope="col">Unidade</th>
            <th scope="col">Problemas</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((row) => (
            <tr key={row.row_number}>
              <td className="num">{row.row_number}</td>
              <td>{row.source_code || "—"}</td>
              <td>{row.original_description || "—"}</td>
              <td>{row.original_unit || "—"}</td>
              <td>
                <ul className="issue-list">
                  {row.issues.map((issue) => (
                    <li key={issue}>
                      <span className="issue-badge">{rowIssueLabel(issue)}</span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
