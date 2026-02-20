/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useActivePatientById, useUpdatePatient } from "../../../features/patient/patient-service";
import type { PatientReq } from "../../../features/patient/types";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";

import ConfirmPasswordDialog from "../../../components/dialog/ConfirmPasswordDialog";
import { usePasswordGate } from "../../../hooks/usePasswordGate";
import { useAuthStore } from "../../../store/auth-store";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;

function toDayjsOrNull(iso?: string): Dayjs | null {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d : null;
}

function isValidNIC(nicRaw: string) {
  const nic = nicRaw.trim();
  if (!nic) return false;
  const twelve = /^[0-9]{12}$/;
  const old = /^[0-9]{9}[VvXx]$/;
  return twelve.test(nic) || old.test(nic);
}

function isValidPhone(phoneRaw: string) {
  const p = phoneRaw.trim();
  if (!p) return true;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

type FormState = {
  fullName: string;
  dob: string;
  bloodGroup: string;
  nic: string;
  gender: string;
  phone: string;
};

function validate(f: FormState) {
  const e: Partial<Record<keyof FormState, string>> = {};

  if (!f.fullName.trim()) e.fullName = "Full name is required";

  if (f.nic.trim()) {
    const nicLower = f.nic.trim().toLowerCase();
    if (!isValidNIC(nicLower)) e.nic = "NIC format is invalid";
  }

  if (!f.gender.trim()) e.gender = "Gender is required";

  if (!f.dob.trim()) e.dob = "DOB is required";
  else if (!dayjs(f.dob).isValid()) e.dob = "Invalid DOB";
  else if (dayjs(f.dob).isAfter(dayjs(), "day")) e.dob = "DOB cannot be in the future";

  if (!isValidPhone(f.phone)) e.phone = "Phone number is invalid";

  return e;
}

export default function NursePatientEditPage() {
  const nav = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const patientQuery = useActivePatientById(id);
  const updatePatient = useUpdatePatient();

  const currentUser = useAuthStore((s) => s.currentUser);
  const username = currentUser?.username ?? null;
  const { gate, askPasswordThen, close, confirm } = usePasswordGate(username);

  const [form, setForm] = useState<FormState>({
    fullName: "",
    dob: "",
    bloodGroup: "",
    nic: "",
    gender: "",
    phone: "",
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  useEffect(() => {
    if (!patientQuery.data) return;
    const p = patientQuery.data;
    const set = () => {
      setForm({
        fullName: p.fullName ?? "",
        dob: p.dob ?? "",
        bloodGroup: p.bloodGroup ?? "",
        nic: p.nic ?? "",
        gender: p.gender ?? "",
        phone: p.phone ?? "",
      });
      setTouched({});
    }
    set()
  }, [patientQuery.data]);

  const allErrors = useMemo(() => validate(form), [form]);
  const errors = useMemo(() => {
    const out: Partial<Record<keyof FormState, string>> = {};
    (Object.keys(allErrors) as (keyof FormState)[]).forEach((k) => {
      if (touched[k]) out[k] = allErrors[k];
    });
    return out;
  }, [allErrors, touched]);

  const touch = (k: keyof FormState) => setTouched((p) => ({ ...p, [k]: true }));

  const setFieldLive = (k: keyof FormState, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    touch(k);
  };

  const requestSave = async () => {
    setTouched({ fullName: true, dob: true, bloodGroup: true, nic: true, gender: true, phone: true });
    const err = validate(form);
    if (Object.values(err).some(Boolean)) return;

    await askPasswordThen({
      title: "Confirm Password to Edit",
      description: "Enter your password to save patient updates.",
      action: async () => {
        const payload: PatientReq = {
          fullName: form.fullName.trim(),
          dob: form.dob.trim(),
          bloodGroup: form.bloodGroup?.trim() || undefined,
          nic: form.nic.trim() || undefined,
          gender: form.gender.trim(),
          phone: form.phone?.trim() || undefined,
        };

        const updated = await updatePatient.mutateAsync({ id, payload });
        nav(`/dashboard/nurse/patients/${updated.id}`);
      },
    });
  };

  const busy = patientQuery.isLoading || updatePatient.isPending || gate.busy;
  const dobDayjs = useMemo(() => toDayjsOrNull(form.dob), [form.dob]);

  return (
    <Box sx={{ py: 2 }}>
      <Stack spacing={0.6} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={900}>
          Edit Patient
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Password required before saving changes
        </Typography>
      </Stack>

      {patientQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientQuery.error as any)?.message ?? "Failed to load patient."}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900}>Patient Information</Typography>
          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                label="Full Name"
                value={form.fullName}
                onChange={(e) => setFieldLive("fullName", e.target.value)}
                onBlur={() => touch("fullName")}
                error={!!errors.fullName}
                helperText={errors.fullName ?? " "}
                fullWidth
                disabled={busy}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="NIC (Optional for under 18)"
                value={form.nic}
                onChange={(e) => setFieldLive("nic", e.target.value)}
                onBlur={() => touch("nic")}
                error={!!errors.nic}
                helperText={errors.nic ?? " "}
                fullWidth
                disabled={busy}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                required
                select
                label="Gender"
                value={form.gender}
                onChange={(e) => setFieldLive("gender", e.target.value)}
                onBlur={() => touch("gender")}
                error={!!errors.gender}
                helperText={errors.gender ?? " "}
                fullWidth
                disabled={busy}
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="DOB"
                  value={dobDayjs}
                  onChange={(val) => {
                    const iso = val && val.isValid() ? val.format("YYYY-MM-DD") : "";
                    setForm((p) => ({ ...p, dob: iso }));
                    touch("dob");
                  }}
                  disableFuture
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      error: !!errors.dob,
                      helperText: errors.dob ?? " ",
                      onBlur: () => touch("dob"),
                      disabled: busy,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Blood Group"
                value={form.bloodGroup}
                onChange={(e) => setFieldLive("bloodGroup", e.target.value)}
                onBlur={() => touch("bloodGroup")}
                helperText=" "
                fullWidth
                disabled={busy}
              >
                <MenuItem value="">—</MenuItem>
                {BLOOD_GROUPS.map((bg) => (
                  <MenuItem key={bg} value={bg}>
                    {bg}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(e) => setFieldLive("phone", e.target.value)}
                onBlur={() => touch("phone")}
                error={!!errors.phone}
                helperText={errors.phone ?? " "}
                fullWidth
                disabled={busy}
                inputProps={{ inputMode: "tel" }}
              />
            </Grid>
          </Grid>

          {updatePatient.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(updatePatient.error as any)?.message ?? "Update failed."}
            </Alert>
          )}

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => nav(`/dashboard/nurse/patients/${id}`)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="contained" onClick={requestSave} disabled={busy || !patientQuery.data}>
              Save
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmPasswordDialog
        open={gate.open}
        title={gate.title}
        description={gate.description}
        busy={gate.busy}
        error={gate.error}
        onClose={close}
        onConfirm={confirm}
      />
    </Box>
  );
}
