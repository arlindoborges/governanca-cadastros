import { ProcessingStatusBadge } from "@/features/normalization/ProcessingStatusBadge";
import { attributeDisplayLabel } from "@/features/normalization/labels";
import type { components } from "@/generated/openapi";

type RecordDetail = components["schemas"]["NormalizationRecordDetail"];

type Props = {
  items: RecordDetail[];
  total: number;
};

export function NormalizationRecordsTable({ items, total }: Props) {
  if (total === 0) {
    return (
      <div className="empty-state empty-state--compact" role="status">
        <p className="empty-state__title">Nenhum registro normalizado</p>
        <p className="empty-state__text">Execute a normalização em um lote concluído.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {total} registro{total === 1 ? "" : "s"} normalizado{total === 1 ? "" : "s"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Linha</th>
            <th scope="col">Código</th>
            <th scope="col">Descrição normalizada</th>
            <th scope="col">Status</th>
            <th scope="col">Atributos</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.record.id}>
              <td className="num">{item.record.row_number}</td>
              <td>{item.record.source_code}</td>
              <td>{item.record.normalized_description}</td>
              <td>
                <ProcessingStatusBadge status={item.record.processing_status} />
              </td>
              <td>
                {item.attributes.length > 0 ? (
                  <ul className="attribute-list">
                    {item.attributes.map((attr) => (
                      <li key={`${item.record.id}-${attr.attribute_code}`}>
                        <span className="attribute-chip">
                          <span className="attribute-chip__label">
                            {attributeDisplayLabel(attr.attribute_code, attr.attribute_name)}
                          </span>
                          <span className="attribute-chip__value">{attr.value_text}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
