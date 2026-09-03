import { batchStatusClass, batchStatusLabel } from "@/features/imports/labels";

type Props = {
  status: string;
};

export function ImportStatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${batchStatusClass(status)}`}>{batchStatusLabel(status)}</span>
  );
}
