import { useState, useRef, useEffect, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger?: ReactNode;
}

export function DropdownMenu({ items, trigger }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button - styled like secondary Button component */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 px-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center"
        aria-label="More options"
      >
        {trigger || <MoreVertical className="w-4 h-4" />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                  ${
                    item.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                  ${
                    item.variant === "danger"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300"
                  }
                `}
              >
                {item.icon && (
                  <span
                    className={`w-4 h-4 ${item.variant === "danger" ? "" : "text-slate-400"}`}
                  >
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
