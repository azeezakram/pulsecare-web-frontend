/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth-store";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Avatar,
  FormHelperText,
  InputAdornment,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import type { UserReq } from "../../../features/user/types";
import {
  useUpdateUserProfilePicture,
  useUserProfilePicture,
  useUpdateUser,
} from "../../../features/user/user-service";
import GradinentSpinner from "../../../components/spinner/GradientSpinner";
import type { ErrorResponseBody } from "../../../common/res-template";

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const shouldFetchImage = Boolean(user?.id && user?.imageUrl);
  const profileImage = useUserProfilePicture(String(user?.id ?? ""), { enabled: shouldFetchImage });

  const [form, setForm] = useState<UserReq>(() => ({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    password: "",
  }));

  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const uploadMutation = useUpdateUserProfilePicture();
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (!file) {
      setPreview(profileImage.data || "");
    }
  }, [profileImage.data, file]);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    if (!filePreview) return;
    setPreview(filePreview);
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  if (!user) return <GradinentSpinner />;

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!form.firstName?.trim()) errs.firstName = "First name is required";
    if (!form.lastName?.trim()) errs.lastName = "Last name is required";

    if (!form.username?.trim()) {
      errs.username = "Username is required";
    } else if (!/^[a-zA-Z0-9]{4,20}$/.test(form.username)) {
      errs.username = "4-20 characters, letters & numbers only";
    }

    if (!form.email?.trim()) {
      errs.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errs.email = "Invalid email format";
    }

    if (form.mobileNumber && !/^\d{10}$/.test(form.mobileNumber)) {
      errs.mobileNumber = "Must be 10 digits";
    }

    if (form.password?.trim() && form.password.trim().length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (key: keyof UserReq, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        await uploadMutation.mutateAsync({ id: user.id, formData: fd });
      }

      const payload: UserReq = {
        ...form,
        firstName: form.firstName?.trim(),
        lastName: form.lastName?.trim(),
        username: form.username?.trim(),
        email: form.email?.trim() ? form.email.trim() : null,
        mobileNumber: form.mobileNumber?.trim() ? form.mobileNumber.trim() : null,
        password: form.password?.trim() ? form.password.trim() : undefined,
      };

      const updatedUser = await updateMutation.mutateAsync({ id: user.id, user: payload });

      if (updatedUser.username !== user.username) {
        alert("Username changed, please log in again.");
        logout();
        navigate("/login");
        return;
      }

      setCurrentUser(updatedUser);
      navigate("/dashboard/admin/settings");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        username: (error as ErrorResponseBody)?.message ?? "Update failed",
      }));
    } finally {
      setSaving(false);
    }
  };

  const busy = uploadMutation.isPending || updateMutation.isPending || saving;

  return (
    <Box sx={{ p: 3 }}>
      <Card
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
        }}
      >
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Stack spacing={0.3} alignItems="center">
              <Typography fontWeight={900} fontSize={18}>
                Admin Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update your details • picture • optional password
              </Typography>
            </Stack>

            <Divider flexItem />

            <Avatar src={preview} sx={{ width: 140, height: 140, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }} />

            <Button variant="text" component="label" sx={{ textTransform: "none" }}>
              Change Profile Picture
              <input hidden accept="image/*" type="file" onChange={handleFileChange} />
            </Button>

            {(["firstName", "lastName", "username", "email", "mobileNumber"] as (keyof UserReq)[]).map((key) => (
              <Box sx={{ width: "100%" }} key={key}>
                <TextField
                  label={key === "mobileNumber" ? "Mobile Number" : key.replace(/^\w/, (c) => c.toUpperCase())}
                  fullWidth
                  value={(form[key] as any) || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  error={!!errors[key]}
                />
                {errors[key] && (
                  <FormHelperText error sx={{ ml: 1 }}>
                    {errors[key]}
                  </FormHelperText>
                )}
              </Box>
            ))}

            <Box sx={{ width: "100%" }}>
              <TextField
                label="New Password (optional)"
                type={showPwd ? "text" : "password"}
                fullWidth
                value={form.password || ""}
                onChange={(e) => handleChange("password", e.target.value)}
                error={!!errors.password}
                helperText={errors.password || "Leave blank to keep current password"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd((v) => !v)} edge="end">
                        {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
              <Button variant="contained" onClick={handleSave} disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </Button>
              <Button variant="outlined" onClick={() => navigate("/dashboard/admin/settings")} disabled={busy}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}