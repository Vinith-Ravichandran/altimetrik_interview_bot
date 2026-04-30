import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [errors,   setErrors]   = useState<Errors>({});
  const [loading,  setLoading]  = useState(false);

  // Live password strength
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6)  s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500", "bg-emerald-500"][strength];

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim())              e.name     = "Name is required";
    else if (name.trim().length < 2) e.name   = "Name must be at least 2 characters";
    if (!email.trim())             e.email    = "Email is required";
    else if (!validateEmail(email))  e.email  = "Enter a valid email address";
    if (!password)                 e.password = "Password is required";
    else if (password.length < 6)  e.password = "Password must be at least 6 characters";
    if (!confirm)                  e.confirm  = "Please confirm your password";
    else if (confirm !== password) e.confirm  = "Passwords do not match";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setErrors({});
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (msg?.toLowerCase().includes("email"))
        setErrors({ email: msg });
      else if (msg?.toLowerCase().includes("username") || msg?.toLowerCase().includes("name"))
        setErrors({ name: msg });
      else
        setErrors({ form: msg ?? "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400
     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition
     ${err ? "border-red-400 bg-red-50" : "border-slate-300"}`;

  function field(
    label: string, type: string, value: string,
    onChange: (v: string) => void, placeholder: string,
    autoComplete: string, err?: string
  ) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
        <input
          type={type} className={inputCls(err)} placeholder={placeholder}
          value={value} autoComplete={autoComplete}
          onChange={e => { onChange(e.target.value); setErrors(p => ({ ...p })); }}
        />
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-sm text-slate-500">
            Join the AI Interview Prep platform
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Sign Up</h2>

          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {field("Full Name", "text", name, setName, "Jane Doe", "name", errors.name)}
            {field("Email Address", "email", email, setEmail, "you@example.com", "email", errors.email)}

            {/* Password with strength meter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                className={inputCls(errors.password)}
                placeholder="Min. 6 characters"
                value={password}
                autoComplete="new-password"
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-slate-200"}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength <= 1 ? "text-red-500" : strength <= 2 ? "text-orange-500" : "text-green-600"}`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
              <input
                type="password"
                className={inputCls(errors.confirm)}
                placeholder="Re-enter password"
                value={confirm}
                autoComplete="new-password"
                onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
              />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
              {!errors.confirm && confirm && confirm === password && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
                         disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg py-3 text-sm font-semibold
                         transition-all shadow-md shadow-purple-200 hover:shadow-lg mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
