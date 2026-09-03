import { IssueStatusBadge } from "@/features/normalization/IssueStatusBadge";
import { attributeCodeLabel, issueTypeLabel } from "@/features/normalization/labels";
import type { components } from "@/generated/openapi";

type ReviewIssue = components["schemas"]["ReviewIssueRead"];

type Props = {
  items: ReviewIssue[];
  total: number;
};

export function NormalizationIssuesTable({ items, total }: Props) {
  if (total === 0) {
    return (
      <div className="empty-state empty-state--compact" role="status">
        <p className="empty-state__title">Nenhuma pendência registrada</p>
        <p className="empty-state__text">Todos os atributos obrigatórios foram extraídos.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {total} pendência{total === 1 ? "" : "s"} no lote
        </caption>
        <thead>
          <tr>
            <th scope="col">Tipo</th>
            <th scope="col">Descrição</th>
            <th scope="col">Atributo</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((issue) => (
            <tr key={issue.id}>
              <td>
                <span className="issue-badge">{issueTypeLabel(issue.issue_type)}</span>
              </td>
              <td>{issue.description}</td>
              <td>{issue.attribute_code ? attributeCodeLabel(issue.attribute_code) : "—"}</td>
              <td>
                <IssueStatusBadge status={issue.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
