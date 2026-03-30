import { useMemo, useState, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useAuth } from "../contexts/AuthContext";
import { usePortfolio } from "../contexts/PortfolioContext";
import { SyncBadge } from "./SyncBadge";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Positions", to: "/positions" },
  { label: "Yield", to: "/yield" },
  { label: "Transactions", to: "/transactions" }
];

export function Layout({ children }: PropsWithChildren) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const location = useLocation();
  const { signOut } = useAuth();
  const {
    clearPendingActions,
    exportData,
    pendingCount,
    refreshing,
    refreshAll,
    syncError
  } = usePortfolio();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname);
    return match?.label ?? "Portfolio";
  }, [location.pathname]);

  const downloadExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `defi-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="app-shell">
      <aside className={`app-nav ${isDesktop ? "desktop" : "mobile"}`}>
        <div className="brand-lockup">
          <div className="brand-glyph">◇</div>
          <div>
            <p className="eyebrow">DeFi</p>
            <h1>Portfolio Tracker</h1>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {isDesktop ? (
          <button className="button button-secondary nav-settings" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        ) : null}
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>{pageTitle}</h2>
          </div>
          <div className="topbar-actions">
            <SyncBadge pendingCount={pendingCount} />
            <button className="button button-secondary" onClick={() => refreshAll()}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="button button-secondary" onClick={downloadExport}>
              Export JSON
            </button>
            {!isDesktop ? (
              <button className="button button-secondary" onClick={() => setSettingsOpen(true)}>
                Settings
              </button>
            ) : null}
          </div>
        </header>

        {syncError ? (
          <div className="sync-error-banner">
            <p className="error-text">{syncError}</p>
            {pendingCount > 0 ? (
              <button
                className="button button-danger sync-error-action"
                onClick={clearPendingActions}
                type="button"
              >
                Clear pending
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="content-area">{children}</section>
      </main>

      {!isDesktop ? (
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="settings-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="button button-ghost" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>
            <p>Sessions are persisted with Supabase Auth and pending edits sync when the app reconnects.</p>
            <button
              className="button button-danger"
              onClick={() => {
                setSettingsOpen(false);
                signOut().catch(() => undefined);
              }}
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
