import { type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabBarProps) {
  return (
    <div
      className={`flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3
              text-sm font-medium rounded-md transition-colors
              ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  ${
                    isActive
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-slate-400 dark:text-slate-500"
                  }
                `}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
