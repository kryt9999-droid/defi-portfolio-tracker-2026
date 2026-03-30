import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MetricHintProps {
  label: string;
  description: string;
  formula?: string;
}

type TooltipPosition = {
  top: number;
  left: number;
};

const TOOLTIP_WIDTH = 320;

export function MetricHint({ label, description, formula }: MetricHintProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();
  const visible = hovered || pinned;

  const updatePosition = useMemo(
    () => () => {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const preferredLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      const left = Math.min(
        Math.max(16, preferredLeft),
        Math.max(16, viewportWidth - TOOLTIP_WIDTH - 16)
      );
      const top = rect.bottom + 12;

      setPosition({ top, left });
    },
    []
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    updatePosition();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    };

    const handlePointer = (event: MouseEvent) => {
      if (!buttonRef.current) {
        return;
      }

      if (!buttonRef.current.contains(event.target as Node)) {
        setPinned(false);
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("mousedown", handlePointer);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousedown", handlePointer);
    };
  }, [updatePosition, visible]);

  return (
    <span className="metric-label">
      <span>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        className={`hint-dot ${visible ? "active" : ""}`}
        aria-label={`${label} details`}
        aria-describedby={visible ? tooltipId : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => {
          updatePosition();
          setPinned((current) => !current);
        }}
      >
        i
      </button>
      {visible && position
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className="metric-tooltip-popover"
              style={{ top: position.top, left: position.left, width: TOOLTIP_WIDTH }}
            >
              <strong>{label}</strong>
              <p>{description}</p>
              {formula ? (
                <div className="metric-tooltip-formula">
                  <span>Formula</span>
                  <code>{formula}</code>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
