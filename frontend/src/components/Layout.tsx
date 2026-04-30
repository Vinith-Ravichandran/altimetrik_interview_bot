import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavIcon({ path, viewBox = "0 0 24 24" }: { path: string; viewBox?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const NAV_ICONS: Record<string, string> = {
  "/":               "M3 9.5L12 3L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z",
  "/documents":      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  "/accounts-roles": "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  "/admin/users":    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  "/interviews":     "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  "/real-interviews":"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
};

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-primary-50 text-primary-700 font-semibold"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    }`;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="text-sm font-bold text-slate-800 tracking-wide uppercase">Interview Prep</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLink to="/" end className={linkClass}>
            <NavIcon path={NAV_ICONS["/"]} />
            Dashboard
          </NavLink>

          <NavLink to="/documents" className={linkClass}>
            <NavIcon path={NAV_ICONS["/documents"]} />
            Study Material
          </NavLink>

          {currentUser?.isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin</p>
              </div>
              <NavLink to="/admin/users" className={linkClass}>
                <NavIcon path={NAV_ICONS["/admin/users"]} />
                Users
              </NavLink>
              <NavLink to="/accounts-roles" className={linkClass}>
                <NavIcon path={NAV_ICONS["/accounts-roles"]} />
                Accounts &amp; Roles
              </NavLink>
            </>
          )}

          {!currentUser?.isAdmin && (
            <>
              <NavLink to="/interviews" className={linkClass}>
                <NavIcon path={NAV_ICONS["/interviews"]} />
                Mock Interviews
              </NavLink>
              <NavLink to="/real-interviews" className={linkClass}>
                <NavIcon path={NAV_ICONS["/real-interviews"]} />
                Post Interview
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        {currentUser && (
          <div className="px-4 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {currentUser.isAdmin ? "Admin" : (currentUser.role || "User")}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full text-sm text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
