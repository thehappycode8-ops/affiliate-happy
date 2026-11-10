import { STATUS_LABEL, type ClipStatus } from '@/lib/types';

export default function StatusBadge({ status }: { status: ClipStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}
