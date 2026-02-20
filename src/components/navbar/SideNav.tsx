import { NavLink } from "react-router-dom";
import { MENU_BY_ROLE } from "./menu.config";
import { useAuthStore } from "../../store/auth-store";

export default function SideNav() {
  const role = useAuthStore((s) => s.role);

  const menu = role ? MENU_BY_ROLE[role] : [];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen fixed">
      <div className="p-6 text-xl font-semibold">PulseCare</div>

      <nav className="space-y-1">
        {menu.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition
              ${isActive ? "bg-slate-800" : "text-slate-300 hover:bg-slate-800"}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
