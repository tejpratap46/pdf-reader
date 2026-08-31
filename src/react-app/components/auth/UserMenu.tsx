import { useState, useRef, useEffect, FC } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import { IcoGoogle, IcoLogOut, IcoLoader, IcoCheck, IcoAlertCircle, IcoX } from "../common/Icons";

interface UserMenuProps {
  border: string;
  bgCard: string;
  bgHover: string;
  textMut: string;
}

export const UserMenu: FC<UserMenuProps> = ({
  border,
  bgCard,
  bgHover,
  textMut,
}) => {
  const { user, loading, logout, signInWithGoogle, actionLoading, error, clearError } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div
        className="w-8 h-8 rounded-none flex items-center justify-center animate-pulse border"
        style={{ background: bgHover, borderColor: border }}
      >
        <span className="w-4 h-4 rounded-none bg-amber-500/30" />
      </div>
    );
  }

  // Not logged in: Direct "Sign in with Google" button (no login dialog)
  if (!user) {
    return (
      <div className="relative flex items-center">
        <button
          onClick={signInWithGoogle}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isAmoled ? "#09090b" : d ? "#27272a" : "#ffffff",
            border: `1px solid ${border}`,
            color: d ? "#f4f4f5" : "#18181b",
          }}
          title="Sign in directly with Google"
        >
          {actionLoading ? (
            <span className="animate-spin">
              <IcoLoader size={14} />
            </span>
          ) : (
            <IcoGoogle size={15} />
          )}
          <span>{actionLoading ? "Signing in..." : "Sign in with Google"}</span>
        </button>

        {/* Error tooltip if sign-in fails */}
        {error && (
          <div
            className="absolute right-0 top-full mt-2 w-72 p-2.5 rounded-none text-xs shadow-xl z-50 flex items-start gap-2 animate-fadeIn"
            style={{
              backgroundColor: d ? "#271c1c" : "#fff1f2",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: d ? "#fca5a5" : "#be123c",
            }}
          >
            <div className="shrink-0 mt-0.5">
              <IcoAlertCircle size={14} />
            </div>
            <div className="flex-1 text-[11px] leading-tight">{error}</div>
            <button
              onClick={clearError}
              className="shrink-0 p-0.5 rounded-none hover:opacity-75 text-current"
              title="Dismiss"
            >
              <IcoX size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Logged in: Show Avatar and User Dropdown
  const displayName = user.displayName || user.email?.split("@")[0] || "Google User";
  const userInitials = (user.displayName?.[0] || user.email?.[0] || "G").toUpperCase();

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 pr-2.5 rounded-none border transition-colors cursor-pointer"
        style={{
          borderColor: border,
          backgroundColor: dropdownOpen ? bgHover : "transparent",
        }}
        title={`Signed in with Google as ${displayName}`}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-none object-cover border"
            style={{ borderColor: border }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-none flex items-center justify-center text-xs font-mono font-bold text-white shadow-inner"
            style={{ background: "linear-gradient(135deg, #4285F4, #34A853)" }}
          >
            {userInitials}
          </div>
        )}
        <span
          className="text-xs font-medium max-w-[110px] truncate hidden sm:inline"
          style={{ color: d ? "#f4f4f5" : "#18181b" }}
        >
          {displayName}
        </span>
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className="absolute right-0 mt-1.5 w-64 rounded-none shadow-xl py-2 z-50 animate-fadeIn"
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${border}`,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* User Details Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: border }}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-none object-cover border shrink-0"
                style={{ borderColor: border }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-none flex items-center justify-center text-sm font-mono font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #4285F4, #34A853)" }}
              >
                {userInitials}
              </div>
            )}
            <div className="overflow-hidden">
              <p
                className="text-xs font-bold truncate"
                style={{ color: d ? "#f4f4f5" : "#18181b" }}
              >
                {displayName}
              </p>
              <p className="text-[11px] font-mono truncate mt-0.5" style={{ color: textMut }}>
                {user.email || "Google Account"}
              </p>
            </div>
          </div>

          {/* Account status badge */}
          <div className="px-4 py-2 border-b flex items-center justify-between text-[11px]" style={{ borderColor: border, color: textMut }}>
            <span className="flex items-center gap-1.5">
              <IcoGoogle size={13} /> Google Account
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-500">
              <IcoCheck size={12} /> [ CONNECTED ]
            </span>
          </div>

          {/* Sign Out Action */}
          <div className="px-2 pt-1">
            <button
              onClick={handleLogout}
              disabled={actionLoading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-none transition-colors text-red-500 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <span className="animate-spin">
                  <IcoLoader size={14} />
                </span>
              ) : (
                <IcoLogOut size={14} />
              )}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
