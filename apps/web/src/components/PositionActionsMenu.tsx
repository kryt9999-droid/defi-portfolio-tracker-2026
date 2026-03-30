import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PositionActionsMenuProps {
  open: boolean;
  label?: string;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_WIDTH = 240;

export function PositionActionsMenu({
  open,
  label = "Actions",
  onToggle,
  onClose,
  children
}: PositionActionsMenuProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuId = useId();

  const updatePosition = useMemo(
    () => () => {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const left = Math.min(
        Math.max(16, rect.right - MENU_WIDTH),
        Math.max(16, viewportWidth - MENU_WIDTH - 16)
      );
      const top = rect.bottom + 10;

      setPosition({ top, left });
    },
    []
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="button button-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open) {
            updatePosition();
          }
          onToggle();
        }}
      >
        {label}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              className="action-menu-popover"
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
