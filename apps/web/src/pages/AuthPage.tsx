import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">DeFi portfolio tracker</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p>
          Sync positions, yield, and transactions across a responsive PWA and an Expo app.
        </p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          className="button button-primary"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              if (mode === "login") {
                await signIn(email, password);
              } else {
                await signUp(email, password);
              }
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Working..." : mode === "login" ? "Login" : "Register"}
        </button>
        <button
          className="button button-ghost"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}
