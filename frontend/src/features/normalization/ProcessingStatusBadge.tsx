import { processingStatusClass, processingStatusLabel } from "@/features/normalization/labels";

type Props = {
  status: string;
};

export function ProcessingStatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${processingStatusClass(status)}`}>
      {processingStatusLabel(status)}
    </span>
  );
}
