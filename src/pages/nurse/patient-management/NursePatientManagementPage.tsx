/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { useAllActivePatients } from "../../../features/patient/patient-service";

import { useAllPatientAdmissions } from "../../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionRes } from "../../../features/patient-admission/types";

type SortKey = "createdAt" | "fullName" | "dob";
type SortDir = "asc" | "desc";

function safeLower(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : v;
}

function latestAdmissionStatus(admissions: PatientAdmissionRes[]) {
  const sorted = [...admissions].sort((a, b) => {
    const at = dayjs(a.admittedAt ?? a.dischargedAt ?? 0).valueOf();
    const bt = dayjs(b.admittedAt ?? b.dischargedAt ?? 0).valueOf();
    return bt - at;
  });
  return sorted[0]?.status ?? null;
}

function statusChip(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return <Chip size="small" color="warning" label="UNDER TREATMENT" />;
  if (s === "DISCHARGED") return <Chip size="small" color="success" label="DISCHARGED" />;
  if (s === "TRANSFERRED") return <Chip size="small" label="TRANSFERRED" />;
  return <Chip size="small" variant="outlined" label="—" />;
}

export default function NursePatientManagementPage() {
  const nav = useNavigate();

  const patientsQuery = useAllActivePatients();
  const admissionsQuery = useAllPatientAdmissions();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);
  const admissions = useMemo(() => admissionsQuery.data ?? [], [admissionsQuery.data]);

  const admissionsByPatient = useMemo(() => {
    const m = new Map<number, PatientAdmissionRes[]>();
    for (const a of admissions) {
      const pid = Number(a.patientId ?? 0);
      if (!pid) continue;
      const cur = m.get(pid) ?? [];
      cur.push(a);
      m.set(pid, cur);
    }
    return m;
  }, [admissions]);

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    let underTreatment = 0;
    let discharged = 0;

    for (const p of patients) {
      const st = latestAdmissionStatus(admissionsByPatient.get(p.id) ?? []);
      if ((st ?? "").toUpperCase() === "ACTIVE") underTreatment++;
      if ((st ?? "").toUpperCase() === "DISCHARGED") discharged++;
    }

    return { totalPatients, underTreatment, discharged };
  }, [patients, admissionsByPatient]);

  const tableRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...patients].sort((a, b) => {
      const av =
        sortKey === "createdAt"
          ? dayjs(a.createdAt).valueOf()
          : sortKey === "fullName"
          ? safeLower(a.fullName)
          : fmtDate(a.dob);

      const bv =
        sortKey === "createdAt"
          ? dayjs(b.createdAt).valueOf()
          : sortKey === "fullName"
          ? safeLower(b.fullName)
          : fmtDate(b.dob);

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [patients, sortKey, sortDir]);

  const suggestions = useMemo(() => {
    const q = safeLower(search);
    if (!q) return [];
    const matches = patients.filter((p) => safeLower(p.fullName).includes(q) || safeLower(p.nic).includes(q));
    return matches.slice(0, 8);
  }, [patients, search]);

  const busy = patientsQuery.isLoading || admissionsQuery.isLoading;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>
            Patient Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search • View • Create • Edit
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={() => patientsQuery.refetch()} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => nav("/dashboard/nurse/patients/new")}
            disabled={busy}
          >
            Create Patient
          </Button>
        </Stack>
      </Stack>

      {(patientsQuery.isError || admissionsQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientsQuery.error as any)?.message ?? (admissionsQuery.error as any)?.message ?? "Failed to load data."}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Patients
              </Typography>
              <Typography variant="h5" fontWeight={900}>
                {stats.totalPatients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Under Treatment
              </Typography>
              <Typography variant="h5" fontWeight={900} color="warning.main">
                {stats.underTreatment}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Discharged
              </Typography>
              <Typography variant="h5" fontWeight={900} color="success.main">
                {stats.discharged}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                options={suggestions}
                // getOptionLabel={(p) => `${p.fullName ?? "—"} • NIC ${p.nic ?? "—"}`}
                filterOptions={(x) => x}
                inputValue={search}
                onInputChange={(_, v) => setSearch(v)}
                onChange={(_, value) => {
                  if (value && typeof value !== "string") {
                    setSearch("");
                    nav(`/dashboard/nurse/patients/${value.id}`);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Search by Name or NIC" placeholder="Type name or NIC..." fullWidth />
                )}
                renderOption={(props, p) => {
                  const st = latestAdmissionStatus(admissionsByPatient.get(p.id) ?? []);
                  return (
                    <li {...props} key={p.id}>
                      <Stack spacing={0.2} sx={{ width: "100%" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={800}>{p.fullName ?? "—"}</Typography>
                          {statusChip(st)}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          NIC: {p.nic ?? "—"} • Phone: {p.phone ?? "—"}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Sort By" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} fullWidth>
                <MenuItem value="createdAt">Created</MenuItem>
                <MenuItem value="fullName">Name</MenuItem>
                <MenuItem value="dob">DOB</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Order" value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} fullWidth>
                <MenuItem value="desc">Desc</MenuItem>
                <MenuItem value="asc">Asc</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack spacing={0.3}>
              <Typography fontWeight={900}>Patients</Typography>
              <Typography variant="body2" color="text.secondary">
                {tableRows.length} record(s)
              </Typography>
            </Stack>
            <Chip label="Nurse View" variant="outlined" />
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>DOB</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {patientsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                ) : tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No patients found.</TableCell>
                  </TableRow>
                ) : (
                  tableRows.slice(0, 300).map((p) => {
                    const st = latestAdmissionStatus(admissionsByPatient.get(p.id) ?? []);
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Stack spacing={0.2}>
                            <Typography fontWeight={800}>{p.fullName ?? "—"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              NIC: {p.nic ?? "—"} • Blood: {p.bloodGroup ?? "—"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{p.gender ?? "—"}</TableCell>
                        <TableCell>{fmtDate(p.dob)}</TableCell>
                        <TableCell>{p.phone ?? "—"}</TableCell>
                        <TableCell>{statusChip(st)}</TableCell>
                        <TableCell>{dayjs(p.createdAt).isValid() ? dayjs(p.createdAt).format("YYYY-MM-DD HH:mm") : "—"}</TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View details">
                              <IconButton onClick={() => nav(`/dashboard/nurse/patients/${p.id}`)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit">
                              <IconButton onClick={() => nav(`/dashboard/nurse/patients/${p.id}/edit`)} disabled={busy}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
