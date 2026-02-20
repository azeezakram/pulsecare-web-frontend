/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  ClickAwayListener,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Popper,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import emptyBoxAsset from "../../../assets/static/symbols/empty-box.png";

import { useAllActivePatients } from "../../../features/patient/patient-service";
import type { PatientRes } from "../../../features/patient/types";

import { useAllBeds } from "../../../features/bed/bed-service";
import type { BedRes } from "../../../features/bed/types";

import { useAllWards } from "../../../features/ward/ward-service";
import type { WardRes } from "../../../features/ward/types";

import { useAllDepartments } from "../../../features/department/department-service";
import type { DeptRes } from "../../../features/department/types";

import { useAllPatientAdmissions } from "../../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionRes } from "../../../features/patient-admission/types";

type SortKey =
  | "admittedAt"
  | "status"
  | "patientName"
  | "patientId"
  | "department"
  | "ward"
  | "bedNo";
type SortDir = "asc" | "desc";

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}
function safeLower(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function statusBadge(s?: string | null) {
  const v = String(s ?? "").toUpperCase();
  const base = {
    display: "inline-flex",
    alignItems: "center",
    px: 1,
    py: 0.35,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.15)",
    userSelect: "none",
    whiteSpace: "nowrap",
  } as const;

  if (v === "ACTIVE") return <Box sx={{ ...base, bgcolor: "rgba(245,158,11,0.18)" }}>ACTIVE</Box>;
  if (v === "DISCHARGED") return <Box sx={{ ...base, bgcolor: "rgba(34,197,94,0.18)" }}>DISCHARGED</Box>;
  if (v === "TRANSFERRED") return <Box sx={{ ...base, bgcolor: "rgba(59,130,246,0.15)" }}>TRANSFERRED</Box>;
  return <Box sx={{ ...base, bgcolor: "rgba(148,163,184,0.18)" }}>—</Box>;
}

function toDeptName(a: PatientAdmissionRes, bedById: Map<number, BedRes>, wardById: Map<number, WardRes>, deptById: Map<number, DeptRes>) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = bed?.wardId ? wardById.get(Number(bed.wardId)) : undefined;
  const dept = ward?.departmentId ? deptById.get(Number(ward.departmentId)) : undefined;
  return dept?.name ?? "—";
}
function toWardName(a: PatientAdmissionRes, bedById: Map<number, BedRes>, wardById: Map<number, WardRes>) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = bed?.wardId ? wardById.get(Number(bed.wardId)) : undefined;
  return ward?.name ?? "—";
}
function toBedNo(a: PatientAdmissionRes, bedById: Map<number, BedRes>) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  return (bed as any)?.bedNo ?? `Bed #${a.bedId ?? "—"}`;
}

function matchesAdmission(
  a: PatientAdmissionRes,
  term: string,
  patientById: Map<number, PatientRes>,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>,
  deptById: Map<number, DeptRes>
) {
  const t = safeLower(term);
  if (!t) return true;

  const pid = Number(a.patientId ?? 0);
  const p = patientById.get(pid);

  const patientName = safeLower(p?.fullName ?? (a as any).patientName ?? "");
  const patientId = String(a.patientId ?? "");
  const status = safeLower(String(a.status ?? ""));
  const dept = safeLower(toDeptName(a, bedById, wardById, deptById));
  const ward = safeLower(toWardName(a, bedById, wardById));
  const bedNo = safeLower(String(toBedNo(a, bedById)));

  return patientName.includes(t) || patientId.includes(t) || status.includes(t) || dept.includes(t) || ward.includes(t) || bedNo.includes(t);
}

function sortAdmissions(
  list: PatientAdmissionRes[],
  key: SortKey,
  dir: SortDir,
  patientById: Map<number, PatientRes>,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>,
  deptById: Map<number, DeptRes>
) {
  const mul = dir === "asc" ? 1 : -1;
  const statusRank: Record<string, number> = { ACTIVE: 0, TRANSFERRED: 1, DISCHARGED: 2 };

  return [...list].sort((a, b) => {
    if (key === "admittedAt") return (dayjs(a.admittedAt ?? 0).valueOf() - dayjs(b.admittedAt ?? 0).valueOf()) * mul;
    if (key === "status") return ((statusRank[String(a.status ?? "").toUpperCase()] ?? 999) - (statusRank[String(b.status ?? "").toUpperCase()] ?? 999)) * mul;
    if (key === "patientName") {
      const ap = patientById.get(Number(a.patientId ?? 0));
      const bp = patientById.get(Number(b.patientId ?? 0));
      return safeLower(ap?.fullName ?? "").localeCompare(safeLower(bp?.fullName ?? "")) * mul;
    }
    if (key === "patientId") return (Number(a.patientId ?? 0) - Number(b.patientId ?? 0)) * mul;
    if (key === "department") return safeLower(toDeptName(a, bedById, wardById, deptById)).localeCompare(safeLower(toDeptName(b, bedById, wardById, deptById))) * mul;
    if (key === "ward") return safeLower(toWardName(a, bedById, wardById)).localeCompare(safeLower(toWardName(b, bedById, wardById))) * mul;
    return safeLower(String(toBedNo(a, bedById))).localeCompare(safeLower(String(toBedNo(b, bedById)))) * mul;
  });
}

function buildSuggestions(
  list: PatientAdmissionRes[],
  term: string,
  sortKey: SortKey,
  sortDir: SortDir,
  patientById: Map<number, PatientRes>,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>,
  deptById: Map<number, DeptRes>
) {
  const t = safeLower(term);
  if (!t) return [];
  const filtered = list.filter((a) => matchesAdmission(a, t, patientById, bedById, wardById, deptById));
  return sortAdmissions(filtered, sortKey, sortDir, patientById, bedById, wardById, deptById).slice(0, 8);
}

export default function DoctorPatientAdmissionPage() {
  const nav = useNavigate();

  const patientsQuery = useAllActivePatients();
  const admissionsQuery = useAllPatientAdmissions();
  const bedsAllQuery = useAllBeds();
  const wardsAllQuery = useAllWards();
  const deptsQuery = useAllDepartments();

  const busy =
    patientsQuery.isLoading ||
    admissionsQuery.isLoading ||
    bedsAllQuery.isLoading ||
    wardsAllQuery.isLoading ||
    deptsQuery.isLoading;

  const patientById = useMemo(() => {
    const m = new Map<number, PatientRes>();
    (patientsQuery.data ?? []).forEach((p) => m.set(Number(p.id), p));
    return m;
  }, [patientsQuery.data]);

  const bedById = useMemo(() => {
    const m = new Map<number, BedRes>();
    (bedsAllQuery.data ?? []).forEach((b) => m.set(Number(b.id), b));
    return m;
  }, [bedsAllQuery.data]);

  const wardById = useMemo(() => {
    const m = new Map<number, WardRes>();
    (wardsAllQuery.data ?? []).forEach((w) => m.set(Number(w.id), w));
    return m;
  }, [wardsAllQuery.data]);

  const deptById = useMemo(() => {
    const m = new Map<number, DeptRes>();
    (deptsQuery.data ?? []).forEach((d) => m.set(Number(d.id), d));
    return m;
  }, [deptsQuery.data]);

  const admissions = useMemo(() => admissionsQuery.data ?? [], [admissionsQuery.data]);

  type TabKey = "ACTIVE" | "DISCHARGED" | "ALL";
  const [tab, setTab] = useState<TabKey>("ALL");

  const baseList = useMemo(() => {
    if (tab === "ACTIVE") return admissions.filter((a) => String(a.status ?? "").toUpperCase() === "ACTIVE");
    if (tab === "DISCHARGED") return admissions.filter((a) => String(a.status ?? "").toUpperCase() === "DISCHARGED");
    return admissions;
  }, [admissions, tab]);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("admittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const searchRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorWidth, setAnchorWidth] = useState(0);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    setAnchorEl(el);
    const updateWidth = () => setAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const suggestions = useMemo(
    () => buildSuggestions(baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById),
    [baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById]
  );

  const filteredSorted = useMemo(() => {
    const t = safeLower(search);
    const filtered = t ? baseList.filter((a) => matchesAdmission(a, t, patientById, bedById, wardById, deptById)) : baseList;
    return sortAdmissions(filtered, sortKey, sortDir, patientById, bedById, wardById, deptById);
  }, [baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById]);

  const refresh = () => admissionsQuery.refetch();

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>Doctor Admission Management</Typography>
          <Typography variant="body2" color="text.secondary">View Admissions • Search • Sort • Open Details</Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {(patientsQuery.isError || admissionsQuery.isError || bedsAllQuery.isError || wardsAllQuery.isError || deptsQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientsQuery.error as any)?.message ??
            (admissionsQuery.error as any)?.message ??
            (bedsAllQuery.error as any)?.message ??
            (wardsAllQuery.error as any)?.message ??
            (deptsQuery.error as any)?.message ??
            "Failed to load admission data."}
        </Alert>
      )}

      {busy && <LinearProgress sx={{ mb: 2 }} />}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
            <Typography fontWeight={900}>Admissions</Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                select
                size="small"
                label="View"
                value={tab}
                onChange={(e) => setTab(e.target.value as any)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="ACTIVE">Currently Admitted</MenuItem>
                <MenuItem value="DISCHARGED">Discharged</MenuItem>
                <MenuItem value="ALL">All</MenuItem>
              </TextField>

              <Typography variant="body2" color="text.secondary">
                Showing <b>{filteredSorted.length}</b>
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box ref={searchRef}>
                <TextField
                  label="Search"
                  placeholder="patient name / patientId / status / department / ward / bed"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSuggestOpen(false);
                  }}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <IconButton size="small" onClick={() => { setSearch(""); setSuggestOpen(false); }}>
                        <ClearIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Box>

              <Popper open={suggestOpen && !!search.trim() && !!anchorEl} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1300, width: anchorWidth }}>
                <ClickAwayListener onClickAway={() => setSuggestOpen(false)}>
                  <Paper variant="elevation" sx={{ mt: 1, maxHeight: 280, overflowY: "auto" }}>
                    {suggestions.length === 0 ? (
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">No matches</Typography>
                      </Box>
                    ) : (
                      <Stack divider={<Divider />} sx={{ p: 0.5 }}>
                        {suggestions.map((a) => {
                          const pid = Number(a.patientId ?? 0);
                          const p = patientById.get(pid);
                          const name = p?.fullName ?? (a as any).patientName ?? "—";
                          return (
                            <Box
                              key={a.id}
                              sx={{ p: 1, cursor: "pointer" }}
                              onClick={() => {
                                setSuggestOpen(false);
                                nav(`/dashboard/doctor/patient-admission/${a.id}`);
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography fontWeight={800}>{name}</Typography>
                                {statusBadge(a.status as any)}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Admission #{a.id} • Patient: {a.patientId ?? "—"} • {toDeptName(a, bedById, wardById, deptById)} • {toWardName(a, bedById, wardById)} • Bed {toBedNo(a, bedById)} • {fmtDT(a.admittedAt)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                </ClickAwayListener>
              </Popper>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField select label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} fullWidth>
                  <MenuItem value="admittedAt">Admitted time</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="patientName">Patient name</MenuItem>
                  <MenuItem value="patientId">Patient ID</MenuItem>
                  <MenuItem value="department">Department</MenuItem>
                  <MenuItem value="ward">Ward</MenuItem>
                  <MenuItem value="bedNo">Bed</MenuItem>
                </TextField>

                <Tooltip title={sortDir === "asc" ? "Ascending" : "Descending"}>
                  <IconButton onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                    {sortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 560, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Ward</TableCell>
                  <TableCell>Bed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Admitted</TableCell>
                  <TableCell>Discharged</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>

              {admissionsQuery.isLoading ? (
                <TableBody>
                  <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>
                </TableBody>
              ) : filteredSorted.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ borderBottom: "none", p: 0 }}>
                      <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} sx={{ py: 2, width: "100%", textAlign: "center" }}>
                        <Avatar src={emptyBoxAsset} sx={{ width: 150, height: 150, mb: 1 }} />
                        <Typography sx={{ fontWeight: "bold", color: "gray" }}>No admission records</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {filteredSorted.slice(0, 500).map((a) => {
                    const pid = Number(a.patientId ?? 0);
                    const p = patientById.get(pid);
                    const patientName = p?.fullName ?? (a as any).patientName ?? "—";

                    return (
                      <TableRow key={a.id} hover sx={{ cursor: "pointer" }} onClick={() => nav(`/dashboard/doctor/patient-admission/${a.id}`)}>
                        <TableCell>
                          <Stack spacing={0.2}>
                            <Typography fontWeight={800}>{patientName}</Typography>
                            <Typography variant="body2" color="text.secondary">Patient: {a.patientId ?? "—"}</Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>{toDeptName(a, bedById, wardById, deptById)}</TableCell>
                        <TableCell>{toWardName(a, bedById, wardById)}</TableCell>
                        <TableCell>{toBedNo(a, bedById)}</TableCell>

                        <TableCell>{statusBadge(a.status as any)}</TableCell>
                        <TableCell>{fmtDT(a.admittedAt)}</TableCell>
                        <TableCell>{fmtDT(a.dischargedAt)}</TableCell>

                        <TableCell align="right">
                          <Tooltip title="Open details">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                nav(`/dashboard/doctor/patient-admission/${a.id}`);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}