import { STATUS_COLORS } from '../lib/constants'

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'gray'
  return (
    <span className={`status-badge status-${color}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}
