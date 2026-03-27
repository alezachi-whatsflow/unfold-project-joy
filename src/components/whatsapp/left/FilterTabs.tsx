interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
  totalCount: number;
  unreadCount: number;
  groupCount: number;
  resolvedCount: number;
  viewMode?: "list" | "kanban";
  onViewModeChange?: (mode: "list" | "kanban") => void;
}

/**
 * Internal filter tabs removed — queue-based flow is now controlled
 * entirely by the TOP tabs in InboxTab.tsx.
 * Component kept as a no-op so existing imports don't break.
 */
export default function FilterTabs(_props: FilterTabsProps) {
  return null;
}
