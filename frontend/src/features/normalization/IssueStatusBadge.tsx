import { issueStatusClass, issueStatusLabel } from "@/features/normalization/labels";

type Props = {
  status: string;
};

export function IssueStatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${issueStatusClass(status)}`}>{issueStatusLabel(status)}</span>
  );
}
