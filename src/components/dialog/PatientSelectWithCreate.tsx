/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";

import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import type { PatientReq, PatientRes } from "../../features/patient/types";
import { useCreatePatient } from "../../features/patient/patient-service";

type PatientFieldErrors = Partial<Record<keyof PatientReq, string>>;

type Props = {
  patients: PatientRes[];
  value: PatientRes | null;
  onChange: (patient: PatientRes | null) => void;
  disabled?: boolean;
  prefillFromInput?: (rawInput: string) => Partial<PatientReq>;
  label?: string;
};

const DEFAULT_FORM: PatientReq = {
  fullName: "",
  gender: "",
  dob: "",
  nic: "",
  bloodGroup: "",
  phone: "",
};

function isValidDateISO(d?: string) {
  if (!d?.trim()) return false;
  const t = Date.parse(d);
  return Number.isFinite(t);
}

function isValidNIC(nicRaw: string) {
  const nic = nicRaw.trim();
  if (!nic) return false;
  const twelve = /^[0-9]{12}$/;
  const old = /^[0-9]{9}[VvXx]$/;
  return twelve.test(nic) || old.test(nic);
}

function recomputePatientErrors(next: PatientReq, patients: PatientRes[]): PatientFieldErrors {
  const e: PatientFieldErrors = {};

  if (!next.fullName?.trim()) e.fullName = "Full name is required";
  if (!next.gender?.trim()) e.gender = "Gender is required";
  if (!next.dob?.trim()) e.dob = "DOB is required";
  else if (!isValidDateISO(next.dob)) e.dob = "DOB must be a valid date";

  if (next.nic?.trim()) {
    const nicLower = next.nic.trim().toLowerCase();
    if (!isValidNIC(nicLower)) e.nic = "NIC format is invalid";
    const exists = patients.some((p) => (p.nic ?? "").trim().toLowerCase() === nicLower);
    if (exists) e.nic = "NIC already exists (must be unique)";
  }

  return e;
}

const filter = createFilterOptions<PatientRes>();

export default function PatientSelectWithCreate({
  patients,
  value,
  onChange,
  disabled,
  label = "Select patient",
}: Props) {
  const createPatient = useCreatePatient();

  const [inputValue, setInputValue] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const [patientForm, setPatientForm] = useState<PatientReq>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof PatientReq, boolean>>>({});
  const [errors, setErrors] = useState<PatientFieldErrors>({});

  const dobDayjs: Dayjs | null = patientForm.dob ? dayjs(patientForm.dob) : null;

  const openCreatePrefilled = () => {
    // const raw = inputValue.trim();
    // const prefill = prefillFromInput?.(raw) ?? {};

    setPatientForm({
      ...DEFAULT_FORM,
    });
    setTouched({});
    setErrors({});
    setOpenCreate(true);
  };

  const onPatientChange = (key: keyof PatientReq, val: any) => {
    const next = { ...patientForm, [key]: val };
    setPatientForm(next);
    const nextTouched = { ...touched, [key]: true };
    setTouched(nextTouched);

    const allErr = recomputePatientErrors(next, patients);
    const filtered: PatientFieldErrors = {};
    (Object.keys(allErr) as (keyof PatientReq)[]).forEach((k) => {
      if (nextTouched[k]) filtered[k] = allErr[k];
    });
    setErrors(filtered);
  };

  const handleCreate = async () => {
    const allTouched: Partial<Record<keyof PatientReq, boolean>> = {
      fullName: true,
      gender: true,
      dob: true,
      nic: true,
    };
    setTouched(allTouched);

    const allErr = recomputePatientErrors(patientForm, patients);
    if (Object.values(allErr).some(Boolean)) {
      setErrors(allErr);
      return;
    }

    const nicTrimmed = (patientForm.nic ?? "").trim();
    const payload: PatientReq = {
      ...patientForm,
      fullName: (patientForm.fullName ?? "").trim(),
      gender: (patientForm.gender ?? "").trim(),
      dob: (patientForm.dob ?? "").trim(),
      bloodGroup: (patientForm.bloodGroup ?? "").trim() || "",
      phone: (patientForm.phone ?? "").trim() || "",
      nic: nicTrimmed ? nicTrimmed : (null as any),
    };

    const created = await createPatient.mutateAsync(payload);

    onChange(created);
    
    const nicLabel = created.nic ? ` • NIC ${created.nic}` : "";
    setInputValue(`${created.fullName ?? "—"}${nicLabel} • ID ${created.id ?? "—"}`);

    setOpenCreate(false);
  };


  return (
    <>
      <Autocomplete
        options={patients}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, v) => setInputValue(v)}
        onChange={(_, v) => onChange(v)}
        disabled={disabled}
        fullWidth
        getOptionLabel={(p) => `${p.fullName ?? "—"} • NIC ${p.nic ?? "—"}`}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          const q = params.inputValue?.trim();
          if (q && filtered.length === 0) {
            return [];
          }
          return filtered.slice(0, 8);
        }}
        renderInput={(params) => (
          <TextField {...params} label={label} placeholder="Search patient..." />
        )}
        noOptionsText={
          inputValue.trim() ? (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No patient found.
              </Typography>
              <Button variant="contained" onMouseDown={(e) => e.preventDefault()} onClick={openCreatePrefilled}>
                Create patient
              </Button>
            </Box>
          ) : (
            "Type to search…"
          )
        }
        renderOption={(props, p) => (
          <li {...props} key={p.id}>
            <Stack spacing={0.2} sx={{ width: "100%" }}>
              <Typography fontWeight={800}>{p.fullName ?? "—"}</Typography>
              <Typography variant="body2" color="text.secondary">
                NIC: {p.nic ?? "—"} • Phone: {p.phone ?? "—"}
              </Typography>
            </Stack>
          </li>
        )}
      />

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Patient</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {createPatient.isError && (
              <Alert severity="error">
                {(createPatient.error as any)?.message ?? "Failed to create patient."}
              </Alert>
            )}

            <TextField
              required
              label="Full Name"
              value={patientForm.fullName ?? ""}
              onChange={(e) => onPatientChange("fullName", e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
              error={!!errors.fullName}
              helperText={errors.fullName}
              fullWidth
            />

            <TextField
              required
              select
              label="Gender"
              value={patientForm.gender ?? ""}
              onChange={(e) => onPatientChange("gender", e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, gender: true }))}
              error={!!errors.gender}
              helperText={errors.gender}
              fullWidth
            >
              <MenuItem value="MALE">Male</MenuItem>
              <MenuItem value="FEMALE">Female</MenuItem>
            </TextField>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="DOB"
                value={dobDayjs}
                onChange={(val) => {
                  const iso = val && val.isValid() ? val.format("YYYY-MM-DD") : "";
                  onPatientChange("dob", iso);
                }}
                disableFuture
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                    error: !!errors.dob,
                    helperText: errors.dob,
                    onBlur: () => setTouched((p) => ({ ...p, dob: true })),
                  },
                }}
              />
            </LocalizationProvider>

            <TextField
              label="NIC (Optional for under 18)"
              value={patientForm.nic ?? ""}
              onChange={(e) => onPatientChange("nic", e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, nic: true }))}
              error={!!errors.nic}
              helperText={errors.nic}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Blood Group"
                  value={patientForm.bloodGroup ?? ""}
                  onChange={(e) => onPatientChange("bloodGroup", e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Phone"
                  value={patientForm.phone ?? ""}
                  onChange={(e) => onPatientChange("phone", e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpenCreate(false)} disabled={createPatient.isPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={createPatient.isPending}>
            {createPatient.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
