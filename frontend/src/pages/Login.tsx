import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading,  setLoading]  = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim())           e.email    = "Email is required";
    else if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!password)               e.password = "Password is required";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setErrors({});
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setErrors({ form: msg ?? "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (field?: string) =>
    `w-full bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400
     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition
     ${field ? "border-red-400 bg-red-50" : "border-slate-300"}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            AI Interview Bot
          </h1>
          <p className="text-sm text-slate-500">
            Adaptive AI-powered interviews · Real-time evaluation · Personalized feedback
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Sign In</h2>

          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                className={inputCls(errors.email)}
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                autoFocus
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className={inputCls(errors.password)}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
                         disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg py-3 text-sm font-semibold
                         transition-all shadow-md shadow-purple-200 hover:shadow-lg mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-purple-600 font-semibold hover:underline">
              Create one
            </Link>
          </p>

          {/* Default credentials hint */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 mb-1.5">Default admin credentials</p>
            <p className="text-xs text-slate-400">
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">admin@interviewprep.com</code>
              {" / "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">admin123</code>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
