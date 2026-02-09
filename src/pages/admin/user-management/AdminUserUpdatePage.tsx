import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  Divider,
  Avatar,
  Alert,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import type { UserReq } from "../../../features/user/types";
import type { DoctorDetailReq } from "../../../features/doctor-detail/type";
import {
  useUserById,
  useUpdateUser,
  useUserProfilePicture,
  useUpdateUserProfilePicture,
  useIsUsernameTaken,
} from "../../../features/user/user-service";
import {
  useDoctorDetailByUserId,
  useCreateDoctorDetail,
  useUpdateDoctorDetail,
} from "../../../features/doctor-detail/doctor-detail-service";
import { useSpecializations } from "../../../features/specialization/specialization-service";
import { useAuthStore } from "../../../store/auth-store";
import { canEditUser } from "../../../utils/admin-user-management-permissions";

export default function AdminUpdateUserPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const idSafe = id ?? "";

  const myRole = useAuthStore((s) => s.currentUser?.role?.name);

  const userQuery = useUserById(idSafe);
  const imgQuery = useUserProfilePicture(idSafe);
  const updateUserMutation = useUpdateUser();
  const uploadMutation = useUpdateUserProfilePicture();
  const specsQuery = useSpecializations();

  const [form, setForm] = useState<UserReq>({ password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [file, setFile] = useState<File | null>(null);
  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const isDoctor =
    userQuery.data?.role?.name?.toUpperCase().includes("DOCTOR") ?? false;

  const docQuery = useDoctorDetailByUserId(idSafe, { enabled: Boolean(idSafe && isDoctor) });
  const createDocMutation = useCreateDoctorDetail();
  const updateDocMutation = useUpdateDoctorDetail();

  const [doctorEnabled, setDoctorEnabled] = useState(false);
  const [doctorForm, setDoctorForm] = useState<DoctorDetailReq>({ specializationIds: [] });
  const [doctorErrors, setDoctorErrors] = useState<Record<string, string>>({});

  const usernameChanged =
    Boolean(userQuery.data?.username) &&
    Boolean(form.username) &&
    form.username !== userQuery.data?.username;

  const usernameTakenQuery = useIsUsernameTaken(usernameChanged ? (form.username ?? "") : "");

  
  const formInitRef = useRef<string | null>(null);
  useEffect(() => {
    const u = userQuery.data;
    if (!u) return;
    if (formInitRef.current === u.id) return;
    formInitRef.current = u.id;

    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      email: u.email ?? "",
      mobileNumber: u.mobileNumber ?? "",
      isActive: u.isActive,
      roleId: undefined, 
      password: "", 
    });

    setFile(null);
    setErrors({});
  }, [userQuery.data]);

  
  const doctorInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!idSafe) return;

    if (!isDoctor) {
      if (doctorInitRef.current === `not-doctor:${idSafe}`) return;
      doctorInitRef.current = `not-doctor:${idSafe}`;
      setDoctorEnabled(false);
      setDoctorForm({ userId: idSafe, licenseNo: "", specializationIds: [] });
      setDoctorErrors({});
      return;
    }

    if (docQuery.isLoading) return;
    if (doctorInitRef.current === `doctor:${idSafe}`) return;
    doctorInitRef.current = `doctor:${idSafe}`;

    if (docQuery.data) {
      setDoctorEnabled(true);
      setDoctorForm({
        userId: idSafe,
        licenseNo: docQuery.data.licenseNo || "",
        specializationIds: docQuery.data.specializations?.map((s) => s.id) || [],
      });
    } else {
      setDoctorEnabled(false);
      setDoctorForm({ userId: idSafe, licenseNo: "", specializationIds: [] });
    }
  }, [idSafe, isDoctor, docQuery.isLoading, docQuery.data]);

  
  const allowed = useMemo(() => {
    if (!userQuery.data) return true;
    return canEditUser(myRole, userQuery.data.role?.name);
  }, [myRole, userQuery.data]);

  if (!id) return <Alert severity="error">Missing user id</Alert>;
  if (userQuery.isLoading) return <div>Loading...</div>;
  if (userQuery.isError) return <Alert severity="error">Failed to load user</Alert>;

  const u = userQuery.data!;
  if (!allowed) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You don’t have permission to edit this protected account.</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(`/dashboard/admin/users`)}>
          Back
        </Button>
      </Box>
    );
  }

  const normalizeUpdatePayload = (req: UserReq): UserReq => ({
    ...req,
    firstName: req.firstName?.trim(),
    lastName: req.lastName?.trim(),
    username: req.username?.trim(),
    email: req.email?.trim() ? req.email.trim() : null,
    mobileNumber: req.mobileNumber?.trim() ? req.mobileNumber.trim() : null,
    password: req.password?.trim() ? req.password.trim() : undefined,
    roleId: undefined,
  });

  const validateUser = () => {
    const e: Record<string, string> = {};
    if (!form.firstName?.trim()) e.firstName = "First name required";
    if (!form.lastName?.trim()) e.lastName = "Last name required";
    if (!form.username?.trim()) e.username = "Username required";
    if (form.username && !/^[a-zA-Z0-9]{4,20}$/.test(form.username)) e.username = "4-20 letters/numbers only";

    if (usernameChanged && usernameTakenQuery.data === true) {
      e.username = "Username already exists";
    }

    if (form.email && form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
    if (form.mobileNumber && form.mobileNumber.trim() && !/^\d{10}$/.test(form.mobileNumber)) e.mobileNumber = "Must be 10 digits";

    // password optional
    if (form.password?.trim() && form.password.trim().length < 6) {
      e.password = "Password must be at least 6 characters";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateDoctor = () => {
    if (!isDoctor || !doctorEnabled) return true;
    const e: Record<string, string> = {};
    if (!doctorForm.licenseNo?.trim()) e.licenseNo = "License number required";
    if (!doctorForm.specializationIds?.length) e.specializationIds = "Pick at least 1 specialization";
    setDoctorErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSpec = (specId: number) => {
    if (!specId) return;
    if ((doctorForm.specializationIds ?? []).includes(specId)) return;
    setDoctorForm((p) => ({ ...p, specializationIds: [...(p.specializationIds ?? []), specId] }));
  };

  const removeSpec = (specId: number) => {
    setDoctorForm((p) => ({ ...p, specializationIds: (p.specializationIds ?? []).filter((x) => x !== specId) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleSave = async () => {
    if (!validateUser()) return;
    if (!validateDoctor()) return;

    const payload = normalizeUpdatePayload(form);
    await updateUserMutation.mutateAsync({ id: idSafe, user: payload });

    if (file) {
      const fd = new FormData();
      fd.append("image", file);
      await uploadMutation.mutateAsync({ id: idSafe, formData: fd });
    }

    if (isDoctor && doctorEnabled) {
      const docPayload = { ...doctorForm, userId: idSafe };
      if (docQuery.data) await updateDocMutation.mutateAsync({ userId: idSafe, data: docPayload });
      else await createDocMutation.mutateAsync(docPayload);
    }

    navigate(`/dashboard/admin/users/${idSafe}`);
  };

  const busy =
    updateUserMutation.isPending ||
    uploadMutation.isPending ||
    createDocMutation.isPending ||
    updateDocMutation.isPending;

  const avatarSrc = filePreview || imgQuery.data || undefined;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Edit User
        </Typography>
        <Button variant="outlined" onClick={() => navigate(`/dashboard/admin/users`)}>
          Back
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={800}>Personal Details</Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={avatarSrc} sx={{ width: 90, height: 90 }}>
                {(u.firstName?.[0] ?? u.username?.[0] ?? "U").toUpperCase()}
              </Avatar>
              <Button variant="outlined" component="label">
                Change Profile Picture
                <input hidden accept="image/*" type="file" onChange={handleFileChange} />
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="First Name"
                value={form.firstName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                error={!!errors.firstName}
                helperText={errors.firstName}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={form.lastName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                error={!!errors.lastName}
                helperText={errors.lastName}
                fullWidth
              />
            </Stack>

            <TextField
              label="Username"
              value={form.username ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              error={!!errors.username}
              helperText={
                errors.username ||
                (usernameChanged && usernameTakenQuery.isFetching ? "Checking username..." : "")
              }
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                value={form.email ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
              <TextField
                label="Mobile Number"
                value={form.mobileNumber ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                error={!!errors.mobileNumber}
                helperText={errors.mobileNumber}
                fullWidth
              />
            </Stack>

            <TextField
              type="password"
              label="New Password (optional)"
              value={form.password ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              error={!!errors.password}
              helperText={errors.password || "Leave blank to keep current password"}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={!!form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />

            {isDoctor && (
              <>
                <Divider />
                <Typography fontWeight={800}>Medical Details</Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={doctorEnabled}
                      onChange={(e) => {
                        setDoctorEnabled(e.target.checked);
                        setDoctorErrors({});
                      }}
                    />
                  }
                  label='Enable "Doctor details"'
                />

                {doctorEnabled && (
                  <Stack spacing={2}>
                    <TextField
                      label="License Number"
                      value={doctorForm.licenseNo ?? ""}
                      onChange={(e) => setDoctorForm((p) => ({ ...p, licenseNo: e.target.value }))}
                      error={!!doctorErrors.licenseNo}
                      helperText={doctorErrors.licenseNo}
                      fullWidth
                    />

                    <TextField
                      select
                      label="Add Specialization"
                      value=""
                      onChange={(e) => addSpec(Number(e.target.value))}
                      error={!!doctorErrors.specializationIds}
                      helperText={doctorErrors.specializationIds}
                      fullWidth
                    >
                      {specsQuery.data?.length ? (
                        specsQuery.data
                          .filter((s) => !(doctorForm.specializationIds ?? []).includes(s.id))
                          .map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.name}
                            </MenuItem>
                          ))
                      ) : (
                        <MenuItem disabled>No specializations available</MenuItem>
                      )}
                    </TextField>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(doctorForm.specializationIds ?? []).map((sid) => {
                        const sp = specsQuery.data?.find((x) => x.id === sid);
                        return sp ? <Chip key={sid} label={sp.name} onDelete={() => removeSpec(sid)} /> : null;
                      })}
                    </Stack>
                  </Stack>
                )}
              </>
            )}

            <Divider />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(`/dashboard/admin/users/${idSafe}`)}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={busy}>
                Save Changes
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
