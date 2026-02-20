/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
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
  MenuItem,
  Chip,
  InputAdornment,
  IconButton,
  Divider,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import type { UserReq } from "../../features/user/types";
import type { DoctorDetailReq } from "../../features/doctor-detail/type";
import {
  useUpdateUserProfilePicture,
  useUserProfilePicture,
  useUpdateUser,
} from "../../features/user/user-service";
import {
  useDoctorDetailByUserId,
  useUpdateDoctorDetail,
  useCreateDoctorDetail,
} from "../../features/doctor-detail/doctor-detail-service";
import { useSpecializations } from "../../features/specialization/specialization-service";
import GradinentSpinner from "../../components/spinner/GradientSpinner";

export default function DoctorProfilePage() {
  const user = useAuthStore((s) => s.currentUser);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const profileImage = useUserProfilePicture(user?.id || "");
  const doctorDetailQuery = useDoctorDetailByUserId(user?.id || "");
  const updateDoctorDetailMutation = useUpdateDoctorDetail();
  const createDoctorDetailMutation = useCreateDoctorDetail();
  const uploadMutation = useUpdateUserProfilePicture();
  const updateUserMutation = useUpdateUser();
  const specializationsQuery = useSpecializations();

  const [form, setForm] = useState<UserReq>(() => ({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    mobileNumber: user?.mobileNumber ?? "",
    password: "",
  }));

  const [doctorForm, setDoctorForm] = useState<DoctorDetailReq>({
    licenseNo: "",
    userId: user?.id || "",
    specializationIds: [],
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingUser, setSavingUser] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    if (!filePreview) return;
    setPreview(filePreview);
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  useEffect(() => {
    if (!file) setPreview(profileImage.data || "");
  }, [profileImage.data, file]);

  useEffect(() => {
    if (doctorDetailQuery.data) {
      setDoctorForm({
        licenseNo: doctorDetailQuery.data.licenseNo || "",
        specializationIds: doctorDetailQuery.data.specializations?.map((s) => s.id) || [],
        userId: user?.id || "",
      });
    } else {
      setDoctorForm({
        licenseNo: "",
        specializationIds: [],
        userId: user?.id || "",
      });
    }
  }, [doctorDetailQuery.data, user?.id]);

  if (!user || specializationsQuery.isLoading) return <GradinentSpinner />;

  const validateAll = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName?.trim()) errs.firstName = "First name is required";
    if (!form.lastName?.trim()) errs.lastName = "Last name is required";

    if (!form.username?.trim()) errs.username = "Username is required";
    else if (!/^[a-zA-Z0-9]{4,20}$/.test(form.username))
      errs.username = "4-20 characters, letters & numbers only";

    if (!form.email?.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email format";

    if (form.mobileNumber && !/^\d{10}$/.test(form.mobileNumber))
      errs.mobileNumber = "Must be 10 digits";

    if (form.password?.trim() && form.password.trim().length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (!doctorForm.licenseNo?.trim()) errs.licenseNo = "License number is required";
    if (!doctorForm.specializationIds || doctorForm.specializationIds.length === 0)
      errs.specializationIds = "Select at least one specialization";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (key: keyof UserReq, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleDoctorChange = (key: keyof DoctorDetailReq, value: any) => {
    setDoctorForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
  };

  const handleAddSpecialization = (id: number) => {
    if (!doctorForm.specializationIds?.includes(id)) {
      setDoctorForm((prev) => ({
        ...prev,
        specializationIds: [...(prev.specializationIds || []), id],
      }));
      setErrors((prev) => ({ ...prev, specializationIds: "" }));
    }
  };

  const handleRemoveSpecialization = (id: number) => {
    setDoctorForm((prev) => ({
      ...prev,
      specializationIds: prev.specializationIds?.filter((sId) => sId !== id),
    }));
  };

  const normalizeUserPayload = (req: UserReq): UserReq => ({
    ...req,
    firstName: req.firstName?.trim(),
    lastName: req.lastName?.trim(),
    username: req.username?.trim(),
    email: req.email?.trim() ? req.email.trim() : null,
    mobileNumber: req.mobileNumber?.trim() ? req.mobileNumber.trim() : null,
    password: req.password?.trim() ? req.password.trim() : undefined,
  });

  const handleSaveUser = async () => {
    if (!validateAll()) return;
    setSavingUser(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        await uploadMutation.mutateAsync({ id: user.id, formData: fd });
      }

      const payload = normalizeUserPayload(form);
      const updatedUser = await updateUserMutation.mutateAsync({ id: user.id, user: payload });
      setCurrentUser(updatedUser);

      if (updatedUser.username !== user.username) {
        alert("Username changed, please log in again.");
        await logout();
        navigate("/login", { replace: true });
        return;
      }

      setForm((p) => ({ ...p, password: "" }));
      navigate("/dashboard/doctor/settings", { replace: true });
    } catch (error) {
      console.error(error);
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveDoctor = async () => {
    if (!validateAll()) return;
    setSavingDoctor(true);
    try {
      if (doctorDetailQuery.data) {
        await updateDoctorDetailMutation.mutateAsync({ userId: user.id, data: doctorForm });
      } else {
        await createDoctorDetailMutation.mutateAsync(doctorForm);
      }
      navigate("/dashboard/doctor/settings", { replace: true });
    } catch (error) {
      console.error(error);
    } finally {
      setSavingDoctor(false);
    }
  };

  const busyUser = savingUser || uploadMutation.isPending || updateUserMutation.isPending;
  const busyDoctor =
    savingDoctor ||
    updateDoctorDetailMutation.isPending ||
    createDoctorDetailMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={900} fontSize={18}>
              Personal Details
            </Typography>
            <Divider />

            <Stack spacing={2} alignItems="center">
              <Avatar src={preview} sx={{ width: 140, height: 140 }} />

              <Button variant="text" component="label" sx={{ textTransform: "none" }}>
                Change Profile Picture
                <input hidden accept="image/*" type="file" onChange={handleFileChange} />
              </Button>

              {(["firstName", "lastName", "username", "email", "mobileNumber"] as (keyof UserReq)[]).map(
                (key) => (
                  <Box sx={{ width: "100%" }} key={key}>
                    <TextField
                      label={key === "mobileNumber" ? "Mobile Number" : key.replace(/^\w/, (c) => c.toUpperCase())}
                      fullWidth
                      value={(form[key] as any) || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      error={!!errors[key]}
                    />
                    {errors[key] && <FormHelperText error>{errors[key]}</FormHelperText>}
                  </Box>
                )
              )}

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

              <Stack direction="row" spacing={2} width="100%">
                <Button variant="contained" onClick={handleSaveUser} disabled={busyUser} fullWidth>
                  {busyUser ? "Saving..." : "Save"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/dashboard/doctor/settings")}
                  fullWidth
                  disabled={busyUser}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={900} fontSize={18}>
              Medical Details
            </Typography>
            <Divider />

            <TextField
              label="License Number"
              fullWidth
              value={doctorForm.licenseNo || ""}
              onChange={(e) => handleDoctorChange("licenseNo", e.target.value)}
              error={!!errors.licenseNo}
              helperText={errors.licenseNo}
            />

            <TextField
              select
              label="Add Specialization"
              fullWidth
              value=""
              onChange={(e) => handleAddSpecialization(Number(e.target.value))}
              helperText={errors.specializationIds}
              error={!!errors.specializationIds}
            >
              {specializationsQuery.data?.length ? (
                specializationsQuery.data
                  .filter((spec) => !(doctorForm.specializationIds ?? []).includes(spec.id))
                  .map((spec) => (
                    <MenuItem key={spec.id} value={spec.id}>
                      {spec.name}
                    </MenuItem>
                  ))
              ) : (
                <MenuItem disabled>No specializations available</MenuItem>
              )}
            </TextField>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {doctorForm.specializationIds?.map((id) => {
                const spec = specializationsQuery.data?.find((s) => s.id === id);
                return spec ? (
                  <Chip key={id} label={spec.name} onDelete={() => handleRemoveSpecialization(id)} />
                ) : null;
              })}
            </Stack>

            <Stack direction="row" spacing={2} width="100%">
              <Button variant="contained" onClick={handleSaveDoctor} disabled={busyDoctor} fullWidth>
                {busyDoctor ? "Saving..." : doctorDetailQuery.data ? "Update" : "Create"}
              </Button>

              <Button
                variant="outlined"
                onClick={() => navigate("/dashboard/doctor/settings")}
                fullWidth
                disabled={busyDoctor}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}