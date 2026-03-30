import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PortfolioProvider } from "./contexts/PortfolioContext";
import { AuthPage } from "./pages/AuthPage";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardPage } from "./pages/DashboardPage";
import { PositionsPage } from "./pages/PositionsPage";
import { YieldPage } from "./pages/YieldPage";
import { TransactionsPage } from "./pages/TransactionsPage";

function AppRoutes() {
  const { loading, session } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading portfolio...</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <PortfolioProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/yield" element={<YieldPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </PortfolioProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
