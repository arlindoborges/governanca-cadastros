import {
  confidenceLevelLabel,
  formatScore,
  matchingResultClass,
  matchingResultLabel,
  relationshipClassBadge,
  relationshipClassLabel,
} from "@/features/matching/labels";
import type { components } from "@/generated/openapi";

type MatchingResultDetail = components["schemas"]["MatchingResultDetail"];

type Props = {
  items: MatchingResultDetail[];
  total: number;
};

export function MatchingResultsTable({ items, total }: Props) {
  if (total === 0) {
    return (
      <div className="empty-state empty-state--compact" role="status">
        <p className="empty-state__title">Nenhum resultado de matching</p>
        <p className="empty-state__text">Execute o matching em um lote normalizado.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {total} resultado{total === 1 ? "" : "s"} de matching
        </caption>
        <thead>
          <tr>
            <th scope="col">Linha</th>
            <th scope="col">Código</th>
            <th scope="col">Descrição</th>
            <th scope="col">Conclusão</th>
            <th scope="col">Confiança</th>
            <th scope="col">Revisão</th>
            <th scope="col">Melhor candidato</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const top = item.top_candidates[0];
            return (
              <tr key={item.result.id}>
                <td className="num">{item.record.row_number}</td>
                <td>{item.record.source_code}</td>
                <td>{item.record.normalized_description}</td>
                <td>
                  <span className={`status-badge ${matchingResultClass(item.result.result)}`}>
                    {matchingResultLabel(item.result.result)}
                  </span>
                </td>
                <td>{confidenceLevelLabel(item.result.confidence_level)}</td>
                <td>{item.result.requires_review ? "Sim" : "Não"}</td>
                <td>
                  {top ? (
                    <div className="candidate-cell">
                      <span>{top.candidate_source_code ?? "—"}</span>
                      <span
                        className={`status-badge ${relationshipClassBadge(top.relationship_class)}`}
                      >
                        {relationshipClassLabel(top.relationship_class)}
                      </span>
                      {top.has_blocker ? (
                        <span className="issue-badge">Bloqueador</span>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="num">{formatScore(top?.overall_score)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
