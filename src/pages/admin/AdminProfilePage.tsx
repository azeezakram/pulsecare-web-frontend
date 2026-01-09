import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Avatar,
  FormHelperText,
} from "@mui/material";
import type { UserReq } from "../../features/user/types";
import {
  useUpdateUserProfilePicture,
  useUserProfilePicture,
  useUpdateUser,
} from "../../features/user/user-service";
import GradinentSpinner from "../../components/spinner/GradientSpinner";

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const profileImage = useUserProfilePicture(user?.id || "");

  const [form, setForm] = useState<UserReq>(() => ({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    mobileNumber: user?.mobileNumber ?? "",
  }));

  const [preview, setPreview] = useState<string>(() => profileImage.data || "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const uploadMutation = useUpdateUserProfilePicture();
  const updateMutation = useUpdateUser();

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
    setPreview(URL.createObjectURL(selected));
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

    const updatedUser = await updateMutation.mutateAsync({ id: user.id, user: form });

    if (updatedUser.username !== user.username) {
      alert("Username changed, please log in again.");
      logout();
      navigate("/login");
      return;
    }

    setCurrentUser(updatedUser);
    navigate("/dashboard/admin/settings");
  } catch (error: any) {
    if (error.response?.status === 409) {
      setErrors((prev) => ({
        ...prev,
        username: "Username already exists",
      }));
    } else {
      console.error("Failed to update profile", error);
    }
  } finally {
    setSaving(false);
  }
};


  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Avatar src={preview} sx={{ width: 150, height: 150 }} />

            <Button variant="text" component="label" sx={{ textTransform: "none" }}>
              Change Profile Picture
              <input hidden accept="image/*" type="file" onChange={handleFileChange} />
            </Button>

            {(["firstName", "lastName", "username", "email", "mobileNumber"] as (keyof UserReq)[])
              .map((key) => (
                <div style={{ width: "100%" }} key={key}>
                  <TextField
                    label={key === "mobileNumber" ? "Mobile Number" : key.replace(/^\w/, c => c.toUpperCase())}
                    fullWidth
                    value={form[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    error={!!errors[key]}
                  />
                  {errors[key] && (
                    <FormHelperText error sx={{ ml: 1 }}>
                      {errors[key]}
                    </FormHelperText>
                  )}
                </div>
              ))}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={uploadMutation.isPending || saving}
              >
                {uploadMutation.isPending || saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outlined" onClick={() => navigate("/dashboard/admin/settings")}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
