import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth-store";
import type { LoginAuthReq } from "../features/auth/types";
import logo2 from "../assets/static/pulse.png";
import { Toast } from 'primereact/toast';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const { login, isLoading, error } = useAuthStore();
    const [form, setForm] = useState<LoginAuthReq>({
        username: "",
        password: "",
    });

    const [remember, setRemember] = useState(false);
    const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const usernameError = validate("username", form.username);
        const passwordError = validate("password", form.password);
        setFormErrors({ username: usernameError || undefined, password: passwordError || undefined });
        if (usernameError || passwordError) return;

        await login(form, remember);
    };

    useEffect(() => {
        if (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Login Failed',
                detail: error,
                life: 3000
            });
        }
    }, [error]);

    const { roles, activeRole } = useAuthStore();

    useEffect(() => {
        if (!roles.length) return;
        if (roles.length === 1 && activeRole) {
            navigate(`/dashboard/${roles[0].toLowerCase()}`);
        } else if (!activeRole && roles.length > 1) {
            navigate("/select-role");
        }
    }, [roles, activeRole, navigate]);



    return (
        <div className="min-h-screen flex items-center justify-center ">
            <Toast ref={toast} />
            <div className="bg-white border-black rounded-2xl p-10 w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <img className="h-20" src={logo2} alt="" />
                </div>
                <h2 className="text-3xl font-extralight text-gray-800 mb-8 text-center">
                    Welcome Back
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            placeholder="Enter your username"
                            value={form.username}
                            onChange={handleChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03a8dd] focus:border-[#03a8dd] bg-white/30 placeholder-gray-600 text-gray-900 ${formErrors.username ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {formErrors.username && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={handleChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03a8dd] focus:border-[#03a8dd] bg-white/30 placeholder-gray-600 text-gray-900 ${formErrors.password ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {formErrors.password && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                        )}
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center">
                        <input
                            id="remember"
                            type="checkbox"
                            checked={remember}
                            onChange={() => setRemember(!remember)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-300 rounded"
                        />
                        <label htmlFor="remember" className="ml-2 block text-gray-700">
                            Remember me
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || isFormInvalid}
                        className={` w-full py-2 px-4 bg-[#03a8dd] text-white font-semibold rounded-lg transition-colors ${isLoading || isFormInvalid ? "opacity-50 cursor-not-allowed" : "hover:bg-[#0288c3] cursor-pointer"
                            }`}
                    >
                        {isLoading ? "Logging in..." : "Login"}
                    </button>

                    <div className="flex justify-center">
                        <a href="#" className="m-auto text-gray-700 font-medium text-sm hover:text-[#03a8dd]">
                            Forgot Password?
                        </a>
                    </div>

                    {/* Backend Error */}
                    {/* {error && (
                        <p className="text-red-600 text-center mt-2">{error}</p>
                    )} */}
                    {/* {error && showError(error)} */}
                </form>
            </div>
        </div>
    );
}