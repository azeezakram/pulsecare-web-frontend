import React, { useState, useEffect } from "react";
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
} from "@mui/material";
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
  const doctorDetailQuery = useDoctorDetailByUserId(user?.id); // only triggers if user?.id exists
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
  }));

  const [doctorForm, setDoctorForm] = useState<DoctorDetailReq>({
    licenseNo: "",
    userId: user?.id || "",
    specializationIds: [],
  });

  const [preview, setPreview] = useState<string>(() => profileImage.data || "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doctorDetailQuery.data) {
      setDoctorForm({
        licenseNo: doctorDetailQuery.data.licenseNo || "",
        specializationIds: doctorDetailQuery.data.specializations?.map((s) => s.id) || [],
        userId: user?.id,
      });
    } else {
      // No doctor detail yet, initialize with empty but include userId
      setDoctorForm({
        licenseNo: "",
        specializationIds: [],
        userId: user?.id,
      });
    }
  }, [doctorDetailQuery.data, user?.id]);

  // Loading condition should only depend on specializations and user
  if (!user || specializationsQuery.isLoading) return <GradinentSpinner />;

  const validate = () => {
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
    setPreview(URL.createObjectURL(selected));
  };

  const handleAddSpecialization = (id: number) => {
    if (!doctorForm.specializationIds?.includes(id)) {
      setDoctorForm((prev) => ({
        ...prev,
        specializationIds: [...(prev.specializationIds || []), id],
      }));
    }
  };

  const handleRemoveSpecialization = (id: number) => {
    setDoctorForm((prev) => ({
      ...prev,
      specializationIds: prev.specializationIds?.filter((sId) => sId !== id),
    }));
  };

  const handleSaveUser = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        await uploadMutation.mutateAsync({ id: user.id, formData: fd });
      }

      const updatedUser = await updateUserMutation.mutateAsync({ id: user.id, user: form });
      setCurrentUser(updatedUser);

      if (updatedUser.username !== user.username) {
        alert("Username changed, please log in again.");
        logout();
        navigate("/login");
        return;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDoctor = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (doctorDetailQuery.data) {
        await updateDoctorDetailMutation.mutateAsync({ userId: user.id, data: doctorForm });
      } else {
        await createDoctorDetailMutation.mutateAsync(doctorForm);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };



  return (
    <Box sx={{ p: 3 }}>
      {/* USER PROFILE CARD */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <h2 style={{ margin: 0 }}>Personal Details</h2>

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
                    {errors[key] && <FormHelperText error>{errors[key]}</FormHelperText>}
                  </div>
                ))}

              <Stack direction="row" spacing={2} width="100%">
                <Button
                  variant="contained"
                  onClick={handleSaveUser}
                  disabled={uploadMutation.isPending || saving}
                  fullWidth
                >
                  {saving ? "Saving..." : "Save"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/dashboard/doctor/settings")}
                  fullWidth
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* DOCTOR DETAILS CARD */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <h2 style={{ margin: 0 }}>Medical Details</h2>

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
              {specializationsQuery.data?.length
                ? specializationsQuery.data
                  .filter((spec) => !(doctorForm.specializationIds ?? []).includes(spec.id))
                  .map((spec) => (
                    <MenuItem key={spec.id} value={spec.id}>
                      {spec.name}
                    </MenuItem>
                  ))
                : <MenuItem disabled>No specializations available</MenuItem>
              }
            </TextField>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {doctorForm.specializationIds?.map((id) => {
                const spec = specializationsQuery.data?.find((s) => s.id === id);
                return spec && (
                  <Chip key={id} label={spec.name} onDelete={() => handleRemoveSpecialization(id)} />
                );
              })}
            </Stack>

            <Stack direction="row" spacing={2} width="100%">
              <Button
                variant="contained"
                onClick={handleSaveDoctor}
                disabled={saving}
                fullWidth
              >
                {saving
                  ? "Saving..."
                  : doctorDetailQuery.data
                    ? "Update"
                    : "Create"
                }
              </Button>

              <Button
                variant="outlined"
                onClick={() => navigate("/dashboard/doctor/settings")}
                fullWidth
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
