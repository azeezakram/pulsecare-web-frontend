import { useAuthStore } from "../store/auth-store";
import { useNavigate } from "react-router-dom";

export default function SelectRolePage() {
  const { roles, setActiveRole } = useAuthStore();
  const navigate = useNavigate();

  const handleSelect = (role: string) => {
    setActiveRole(role);
    navigate(`/dashboard/${role.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Select Dashboard
        </h2>

        <div className="space-y-4">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => handleSelect(role)}
              className="w-full py-3 rounded-xl border border-gray-300
                         hover:bg-[#03a8dd] hover:text-white
                         transition font-medium"
            >
              {role.charAt(0) + role.slice(1).toLowerCase()} Dashboard
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
