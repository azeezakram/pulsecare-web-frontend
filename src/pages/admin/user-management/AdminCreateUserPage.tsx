// src/pages/admin/AdminCreateUserPage.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import type { UserReq } from "../../../features/user/types";
import type { DoctorDetailReq } from "../../../features/doctor-detail/type";
import { useCreateUser, useIsUsernameTaken } from "../../../features/user/user-service";
import { useCreateDoctorDetail } from "../../../features/doctor-detail/doctor-detail-service";
import { useSpecializations } from "../../../features/specialization/specialization-service";
import { useAllRoles } from "../../../features/role/role-service";
import { updateProfileImage } from "../../../api/user.api";
import { useAuthStore } from "../../../store/auth-store";

const emptyUserForm = (): UserReq => ({
  firstName: "",
  lastName: "",
  username: "",
  email: undefined,
  password: "",
  mobileNumber: undefined,
  roleId: undefined,
  isActive: true,
});

const emptyDoctorForm = (userId?: string): DoctorDetailReq => ({
  userId,
  licenseNo: "",
  specializationIds: [],
});

// tiny debounce hook (no libs)
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const SUPER_ROLES = new Set(["SUPER_ADMIN", "SUPER_DOCTOR", "SUPER_NURSE"]);

export default function AdminCreateUserPage() {
  const navigate = useNavigate();

  const myRole = useAuthStore((s) => s.role); // "ADMIN" | "SUPER_ADMIN" | ...
  const isSuperAdmin = (myRole ?? "").toUpperCase() === "SUPER_ADMIN";

  const createUserMutation = useCreateUser();
  const createDoctorDetailMutation = useCreateDoctorDetail();
  const specializationsQuery = useSpecializations();
  const rolesQuery = useAllRoles();

  const [form, setForm] = useState<UserReq>(emptyUserForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [doctorEnabled, setDoctorEnabled] = useState(false);
  const [doctorForm, setDoctorForm] = useState<DoctorDetailReq>(emptyDoctorForm());
  const [doctorErrors, setDoctorErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [profileUploadError, setProfileUploadError] = useState<string | null>(null);

  // ✅ filter dropdown roles (admins only see normal roles)
  const visibleRoles = useMemo(() => {
    const list = rolesQuery.data ?? [];
    if (isSuperAdmin) return list;
    return list.filter((r) => !SUPER_ROLES.has((r.name ?? "").toUpperCase()));
  }, [rolesQuery.data, isSuperAdmin]);

  const selectedRoleName = useMemo(() => {
    const roleId = form.roleId;
    return (rolesQuery.data?.find((r) => r.id === roleId)?.name ?? "").toUpperCase();
  }, [form.roleId, rolesQuery.data]);

  const isDoctorRole = selectedRoleName === "DOCTOR" || selectedRoleName === "SUPER_DOCTOR";

  React.useEffect(() => {
    if (!isDoctorRole) {
      setDoctorEnabled(false);
      setDoctorForm(emptyDoctorForm());
      setDoctorErrors({});
    }
  }, [isDoctorRole]);

  React.useEffect(() => {
    return () => {
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    };
  }, [profilePreviewUrl]);

  const usernameTrimmed = (form.username ?? "").trim();
  const debouncedUsername = useDebouncedValue(usernameTrimmed, 450);

  const usernameValidFormat =
    debouncedUsername.length >= 4 && /^[a-zA-Z0-9]{4,20}$/.test(debouncedUsername);

  const usernameTakenQuery = useIsUsernameTaken(debouncedUsername, {
    enabled: usernameValidFormat,
  });

  const isUsernameTaken = usernameTakenQuery.data === true;
  const isCheckingUsername = usernameTakenQuery.isFetching;

  const validateUser = (u: UserReq) => {
    const errs: Record<string, string> = {};

    const uname = (u.username ?? "").trim();
    if (!u.firstName?.trim()) errs.firstName = "First name required";
    if (!u.lastName?.trim()) errs.lastName = "Last name required";

    if (!uname) errs.username = "Username required";
    else if (!/^[a-zA-Z0-9]{4,20}$/.test(uname)) errs.username = "4-20 letters/numbers only";
    else if (isUsernameTaken) errs.username = "Username already taken";

    if (!u.password?.trim()) errs.password = "Password required";
    if (u.email && !/^\S+@\S+\.\S+$/.test(u.email)) errs.email = "Invalid email";
    if (u.mobileNumber && !/^\d{10}$/.test(u.mobileNumber)) errs.mobileNumber = "Must be 10 digits";

    if (u.roleId == null) errs.roles = "Select role";

    // ✅ enforce: only SUPER_ADMIN can create SUPER_* roles
    if (u.roleId != null) {
      const chosen = (rolesQuery.data?.find((r) => r.id === u.roleId)?.name ?? "").toUpperCase();
      if (SUPER_ROLES.has(chosen) && !isSuperAdmin) {
        errs.roles = "Only SUPER_ADMIN can create SUPER roles";
      }
    }

    return errs;
  };

  const validateDoctor = (d: DoctorDetailReq) => {
    const errs: Record<string, string> = {};
    if (!d.licenseNo?.trim()) errs.licenseNo = "License number required";
    if (!d.specializationIds || d.specializationIds.length === 0)
      errs.specializationIds = "Pick at least 1 specialization";
    return errs;
  };

  const addSpec = (id: number) => {
    if (!id) return;
    if ((doctorForm.specializationIds ?? []).includes(id)) return;
    setDoctorForm((p) => ({ ...p, specializationIds: [...(p.specializationIds ?? []), id] }));
  };

  const removeSpec = (id: number) => {
    setDoctorForm((p) => ({
      ...p,
      specializationIds: (p.specializationIds ?? []).filter((x) => x !== id),
    }));
  };

  const onPickProfileImage = () => fileInputRef.current?.click();

  const onProfileFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setProfileUploadError(null);

    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileUploadError("Please select an image file");
      e.target.value = "";
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      setProfileUploadError("Image must be 3MB or smaller");
      e.target.value = "";
      return;
    }

    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    const preview = URL.createObjectURL(file);

    setProfileFile(file);
    setProfilePreviewUrl(preview);
  };

  const removeProfileImage = () => {
    setProfileUploadError(null);
    setProfileFile(null);
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setProfilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const normalizeUserPayload = (u: UserReq): UserReq => ({
    ...u,
    username: u.username?.trim(),
    password: u.password?.trim(),
    email: u.email?.trim() ? u.email.trim() : null,
    mobileNumber: u.mobileNumber?.trim() ? u.mobileNumber.trim() : null,
  });

  const handleSubmit = async () => {
    setProfileUploadError(null);

    if (usernameValidFormat && isCheckingUsername) {
      setErrors((p) => ({ ...p, username: "Checking username availability..." }));
      return;
    }

    const uErrs = validateUser(form);
    setErrors(uErrs);
    if (Object.keys(uErrs).length > 0) return;

    if (isDoctorRole && doctorEnabled) {
      const dErrs = validateDoctor(doctorForm);
      setDoctorErrors(dErrs);
      if (Object.keys(dErrs).length > 0) return;
    }

    const payload = normalizeUserPayload(form);
    const created = await createUserMutation.mutateAsync(payload);

    if (isDoctorRole && doctorEnabled) {
      await createDoctorDetailMutation.mutateAsync({
        ...doctorForm,
        userId: created.id,
      });
    }

    if (profileFile) {
      try {
        const fd = new FormData();
        fd.append("image", profileFile);
        await updateProfileImage(created.id, fd);
      } catch {
        setProfileUploadError("User created, but profile image upload failed.");
        return;
      }
    }

    navigate("/dashboard/admin/users");
  };

  const busy = createUserMutation.isPending || createDoctorDetailMutation.isPending || isCheckingUsername;

  const usernameHelperText =
    errors.username ||
    (usernameValidFormat && isCheckingUsername
      ? "Checking availability..."
      : usernameValidFormat && isUsernameTaken
        ? "Username already taken"
        : "");

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Add New User
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/dashboard/admin/users")}>
          Back
        </Button>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={700}>Personal Details</Typography>

            <Stack spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Avatar
                src={profilePreviewUrl ?? undefined}
                sx={{ width: 130, height: 130, cursor: "pointer" }}
                onClick={onPickProfileImage}
              >
                {(form.firstName?.[0] ?? form.username?.[0] ?? "U").toUpperCase()}
              </Avatar>

              <Stack direction="row" spacing={1}>
                <Button size="small" variant="text" onClick={onPickProfileImage}>
                  Choose Picture
                </Button>
                {profileFile && (
                  <Button size="small" color="error" onClick={removeProfileImage}>
                    Remove
                  </Button>
                )}
              </Stack>

              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onProfileFileChange} />
            </Stack>

            {profileUploadError && <Alert severity="warning">{profileUploadError}</Alert>}

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
              onChange={(e) => {
                setForm((p) => ({ ...p, username: e.target.value }));
                setErrors((p) => ({ ...p, username: "" }));
              }}
              error={Boolean(errors.username) || (usernameValidFormat && isUsernameTaken)}
              helperText={usernameHelperText}
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                value={(form.email ?? "") as any}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
              <TextField
                label="Mobile Number"
                value={(form.mobileNumber ?? "") as any}
                onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                error={!!errors.mobileNumber}
                helperText={errors.mobileNumber}
                fullWidth
              />
            </Stack>

            <TextField
              type="password"
              label="Password"
              value={form.password ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              error={!!errors.password}
              helperText={errors.password}
              fullWidth
            />

            <TextField
              select
              label="Role"
              value={form.roleId ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, roleId: Number(e.target.value) }))}
              error={!!errors.roles}
              helperText={errors.roles}
              fullWidth
            >
              {visibleRoles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={!!form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />

            {isDoctorRole && (
              <>
                <Divider />
                <Typography fontWeight={700}>Doctor Details</Typography>

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
                      {specializationsQuery.data?.length ? (
                        specializationsQuery.data
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
                      {(doctorForm.specializationIds ?? []).map((id) => {
                        const spec = specializationsQuery.data?.find((x) => x.id === id);
                        if (!spec) return null;
                        return <Chip key={id} label={spec.name} onDelete={() => removeSpec(id)} />;
                      })}
                    </Stack>

                    {specializationsQuery.isError && (
                      <Alert severity="warning">
                        Failed to load specializations (backend error). Doctor details may not be saved.
                      </Alert>
                    )}
                  </Stack>
                )}
              </>
            )}

            <Divider />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate("/dashboard/admin/users")}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={busy || (usernameValidFormat && isUsernameTaken)}
              >
                {busy ? "Creating..." : "Create User"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
