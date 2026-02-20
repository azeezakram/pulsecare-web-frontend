import { useAuthStore } from "../../store/auth-store";
import BreadCrumbs from "../bread-crumbs/Breadcrumbs";

export default function TopBar() {
  const user = useAuthStore(s => s.currentUser);

  return (
    <header className="bg-white px-6 py-4 shadow-sm flex justify-between">
      <BreadCrumbs/>
      <div className="text-sm font-medium">
        {user?.username}  
      </div>
    </header>
  );
}
