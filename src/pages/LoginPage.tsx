import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth-store";
import type { LoginAuthReq } from "../features/auth/types";
import logo2 from "../assets/static/pulse.png";
import { Toast } from "primereact/toast";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();

  const { login, isLoading, error, token, role } = useAuthStore();

  const [form, setForm] = useState<LoginAuthReq>({
    username: "",
    password: "",
  });

  const [remember, setRemember] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // ---------------- Validation ----------------
  const validate = (field: string, value: string) => {
    if (field === "username") {
      if (!value.trim()) return "Username is required";
      if (value.length < 3) return "Username must be at least 3 characters";
    }
    if (field === "password") {
      if (!value.trim()) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
    }
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    const errorMsg = validate(name, value);
    setFormErrors((prev) => ({ ...prev, [name]: errorMsg || undefined }));
  };

  const isFormInvalid =
    !form.username.trim() ||
    !form.password.trim() ||
    !!formErrors.username ||
    !!formErrors.password;

  // ---------------- Submit ----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const usernameError = validate("username", form.username);
    const passwordError = validate("password", form.password);

    setFormErrors({
      username: usernameError || undefined,
      password: passwordError || undefined,
    });

    if (usernameError || passwordError) return;

    await login(form, remember);
  };

  // ---------------- Error Toast ----------------
  useEffect(() => {
    if (error) {
      toast.current?.show({
        severity: "error",
        summary: "Login Failed",
        detail: error,
        life: 3000,
      });
    }
  }, [error]);

  // ---------------- Redirect After Login ----------------
  useEffect(() => {
    if (token && role) {
      navigate(`/dashboard/${role.toLowerCase()}`, { replace: true });
    }
  }, [token, role, navigate]);

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Toast ref={toast} />

      <div className="bg-white rounded-2xl p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img className="h-20" src={logo2} alt="PulseCare" />
        </div>

        <h2 className="text-3xl font-extralight text-gray-800 mb-8 text-center">
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#03a8dd]
                ${formErrors.username ? "border-red-500" : "border-gray-300"}`}
            />
            {formErrors.username && (
              <p className="text-red-500 text-sm mt-1">
                {formErrors.username}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#03a8dd]
                ${formErrors.password ? "border-red-500" : "border-gray-300"}`}
            />
            {formErrors.password && (
              <p className="text-red-500 text-sm mt-1">
                {formErrors.password}
              </p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="h-4 w-4"
            />
            <label className="ml-2 text-gray-700">Remember me</label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isFormInvalid}
            className={`w-full py-2 px-4 bg-[#03a8dd] text-white rounded-lg
              ${isLoading || isFormInvalid ? "opacity-50" : "hover:bg-[#0288c3]"}`}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
