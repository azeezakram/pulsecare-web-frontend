
import { useAuthStore } from "../../store/auth-store";

function AdminHomePage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  return <div>AdminHomePage {currentUser?.firstName}</div>;
}

export default AdminHomePage;
