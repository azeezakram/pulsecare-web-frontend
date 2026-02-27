import { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Divider,
  useMediaQuery,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Toast } from "primereact/toast";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/auth-store";
import type { LoginAuthReq } from "../features/auth/types";
import logo from "../assets/static/logo/logo-light.png";

export default function LoginPage() {
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:900px)");

  const { login, isLoading, error, token, role } = useAuthStore();

  const [form, setForm] = useState<LoginAuthReq>({
    username: "",
    password: "",
  });
  const [remember, setRemember] = useState(false);

  const [touched, setTouched] = useState({ username: false, password: false });
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const [showPassword, setShowPassword] = useState(false);

  const validate = (values: LoginAuthReq) => {
    const e: { username?: string; password?: string } = {};

    if (!values.username.trim()) e.username = "Username is required";
    if (!values.password.trim()) e.password = "Password is required";

    return e;
  };

  const handleChange = (field: keyof LoginAuthReq, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);

    if (touched[field]) {
      setErrors(validate(next));
    }
  };

  const handleBlur = (field: keyof LoginAuthReq) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eMap = validate(form);
    setErrors(eMap);
    setTouched({ username: true, password: true });

    if (Object.keys(eMap).length > 0) return;

    await login(form, remember);
  };

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

  useEffect(() => {
    if (token && role) {
      navigate(`/dashboard/${role.toLowerCase()}`, { replace: true });
    }
  }, [token, role, navigate]);

  const commonStandardStyles = {
    InputLabelProps: { sx: { color: "rgba(255,255,255,0.7)" } },
    InputProps: {
      sx: {
        color: "#fff",
        "&:before": { borderBottomColor: "rgba(255,255,255,0.35)" },
        "&:hover:not(.Mui-disabled):before": { borderBottomColor: "rgba(255,255,255,0.7)" },
        "&:after": { borderBottomColor: "#03a8dd" },
      },
    },
    FormHelperTextProps: { sx: { color: "#ff6b6b", mt: 0.5 } },
  } as const;

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ backgroundColor: "#121212" }}
    >
      <Toast ref={toast} />

      <Card
        elevation={0}
        sx={{
          width: "min(1000px, 100%)",
          height: isMobile ? "auto" : 520,
          borderRadius: 0,
          backgroundColor: "transparent",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1px 1fr",
          color: "#fff",
        }}
      >
        
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ px: 6, py: isMobile ? 5 : 0 }}>
          <Stack spacing={2} alignItems="center">
            <img src={logo} alt="PulseCare" style={{ height: 70 }} />
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.65)", textAlign: "left", maxWidth: 280 }}
            >
              Designed and Developed by Azeez
            </Typography>
          </Stack>
        </Box>

        
        {!isMobile && <Divider orientation="vertical" sx={{ backgroundColor: "rgba(255,255,255,0.25)" }} />}

        
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ px: 6, py: isMobile ? 5 : 0 }}>
          <Box width="100%" maxWidth={340}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              Welcome
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
              Please login to dashboard.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  variant="standard"
                  label="Username"
                  name="username"
                  fullWidth
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  onBlur={() => handleBlur("username")}
                  error={!!errors.username && touched.username}
                  helperText={touched.username ? errors.username : ""}
                  {...commonStandardStyles}
                />

                <TextField
                  variant="standard"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  fullWidth
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  error={!!errors.password && touched.password}
                  helperText={touched.password ? errors.password : ""}
                  InputLabelProps={commonStandardStyles.InputLabelProps}
                  FormHelperTextProps={commonStandardStyles.FormHelperTextProps}
                  InputProps={{
                    ...commonStandardStyles.InputProps,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          sx={{ color: "rgba(255,255,255,0.75)" }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                      sx={{
                        color: "rgba(255,255,255,0.7)",
                        "&.Mui-checked": { color: "#03a8dd" },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      Remember me
                    </Typography>
                  }
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    mt: 1,
                    py: 1.2,
                    borderRadius: 5,
                    backgroundColor: "#03a8dd",
                    color: "#fff",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    "&:hover": { backgroundColor: "#0288c3" },
                    "&.Mui-disabled": { opacity: 0.6, color: "#fff" },
                  }}
                >
                  {isLoading ? "LOGGING IN..." : "Login"}
                </Button>

                {/* <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    textAlign: "center",
                    "&:hover": { color: "rgba(255,255,255,0.85)" },
                  }}
                >
                  Forgot your password?
                </Typography> */}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
