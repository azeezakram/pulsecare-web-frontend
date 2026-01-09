// components/layout/TopBar.tsx
import Breadcrumbs from "../Breadcrumbs";
import { useAuthStore } from "../../store/auth-store";

export default function TopBar() {
  const user = useAuthStore(s => s.currentUser);

  return (
    <header className="bg-white px-6 py-4 shadow-sm flex justify-between">
      <Breadcrumbs />
      <div className="text-sm font-medium">
        {user?.username}
      </div>
    </header>
  );
}
