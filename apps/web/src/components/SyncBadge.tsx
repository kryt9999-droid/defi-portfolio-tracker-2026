interface SyncBadgeProps {
  pendingCount: number;
}

export function SyncBadge({ pendingCount }: SyncBadgeProps) {
  const synced = pendingCount === 0;

  return (
    <div className="sync-badge">
      <span className={`sync-dot ${synced ? "synced" : "pending"}`} />
      <span>{synced ? "Synced" : `${pendingCount} pending`}</span>
    </div>
  );
}
