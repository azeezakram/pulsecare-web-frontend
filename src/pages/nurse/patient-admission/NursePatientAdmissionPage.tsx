/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ClearIcon from "@mui/icons-material/Clear";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

import dayjs from "dayjs";

import emptyBoxAsset from "../../../assets/static/symbols/empty-box.png";

import { useAllActivePatients } from "../../../features/patient/patient-service";
import type { PatientRes } from "../../../features/patient/types";

import { useAllBeds } from "../../../features/bed/bed-service";
import type { BedRes } from "../../../features/bed/types";

import type { WardRes } from "../../../features/ward/types";
import { useAllWards } from "../../../features/ward/ward-service";

import { useAllDepartments } from "../../../features/department/department-service";
import type { DeptRes } from "../../../features/department/types";

import {
  useAllPatientAdmissions,
  useCreatePatientAdmission,
  useUpdatePatientAdmission
} from "../../../features/patient-admission/patientAdmission-service";

import { useNavigate } from "react-router-dom";
import type { PatientAdmissionReq, PatientAdmissionRes } from "../../../features/patient-admission/types";
import { usePrescriptionsByAdmissionId } from "../../../features/prescription/prescription-service";

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
    gap: 0.8,
    px: 1,
    py: 0.4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(0,0,0,0.15)",
    userSelect: "none",
    whiteSpace: "nowrap",
  } as const;

  if (v === "ACTIVE") return <Box sx={{ ...base, bgcolor: "rgba(245,158,11,0.18)" }}>ACTIVE</Box>;
  if (v === "DISCHARGED") return <Box sx={{ ...base, bgcolor: "rgba(34,197,94,0.18)" }}>DISCHARGED</Box>;
  if (v === "TRANSFERRED") return <Box sx={{ ...base, bgcolor: "rgba(59,130,246,0.15)" }}>TRANSFERRED</Box>;
  return <Box sx={{ ...base, bgcolor: "rgba(148,163,184,0.18)" }}>—</Box>;
}

function toDeptName(
  a: PatientAdmissionRes,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>,
  deptById: Map<number, DeptRes>
) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = bed?.wardId ? wardById.get(Number(bed.wardId)) : undefined;
  const dept = ward?.departmentId ? deptById.get(Number(ward.departmentId)) : undefined;
  return dept?.name ?? "—";
}
function toWardName(
  a: PatientAdmissionRes,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>
) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = bed?.wardId ? wardById.get(Number(bed.wardId)) : undefined;
  return ward?.name ?? "—";
}
function toBedNo(a: PatientAdmissionRes, bedById: Map<number, BedRes>) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  return (bed?.bedNo as any) ?? (bed?.bedNo as any) ?? `Bed #${a.bedId ?? "—"}`;
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
  const patient = patientById.get(pid);

  const patientName = safeLower(patient?.fullName ?? (a as any).patientName ?? "");
  const patientId = String(a.patientId ?? "");
  const status = safeLower(String(a.status ?? ""));
  const dept = safeLower(toDeptName(a, bedById, wardById, deptById));
  const ward = safeLower(toWardName(a, bedById, wardById));
  const bedNo = safeLower(String(toBedNo(a, bedById)));

  return (
    patientName.includes(t) ||
    patientId.includes(t) ||
    status.includes(t) ||
    dept.includes(t) ||
    ward.includes(t) ||
    bedNo.includes(t)
  );
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
    if (key === "admittedAt") {
      const av = dayjs(a.admittedAt ?? 0).valueOf();
      const bv = dayjs(b.admittedAt ?? 0).valueOf();
      return (av - bv) * mul;
    }
    if (key === "status") {
      const av = statusRank[String(a.status ?? "").toUpperCase()] ?? 999;
      const bv = statusRank[String(b.status ?? "").toUpperCase()] ?? 999;
      return (av - bv) * mul;
    }
    if (key === "patientName") {
      const ap = patientById.get(Number(a.patientId ?? 0));
      const bp = patientById.get(Number(b.patientId ?? 0));
      return safeLower(ap?.fullName ?? "").localeCompare(safeLower(bp?.fullName ?? "")) * mul;
    }
    if (key === "patientId") {
      const av = Number(a.patientId ?? 0);
      const bv = Number(b.patientId ?? 0);
      return (av - bv) * mul;
    }
    if (key === "department") {
      return (
        safeLower(toDeptName(a, bedById, wardById, deptById)).localeCompare(
          safeLower(toDeptName(b, bedById, wardById, deptById))
        ) * mul
      );
    }
    if (key === "ward") {
      return (
        safeLower(toWardName(a, bedById, wardById)).localeCompare(
          safeLower(toWardName(b, bedById, wardById))
        ) * mul
      );
    }
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

type HoverTip = { x: number; y: number; title: string; subtitle?: string } | null;

function TooltipBox({ tip }: { tip: HoverTip }) {
  if (!tip) return null;

  const maxW = 280;
  const pad = 14;
  const left = Math.min(tip.x + pad, window.innerWidth - maxW - 12);
  const top = Math.min(tip.y + pad, window.innerHeight - 80);

  return (
    <Box
      sx={{
        position: "fixed",
        left,
        top,
        pointerEvents: "none",
        zIndex: 2000,
        bgcolor: "rgba(20,20,20,0.92)",
        color: "#fff",
        px: 1.2,
        py: 0.9,
        borderRadius: 1.5,
        boxShadow: "0 10px 26px rgba(0,0,0,0.38)",
        maxWidth: maxW,
        backdropFilter: "blur(4px)",
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{tip.title}</Typography>
      {tip.subtitle && (
        <Typography sx={{ fontSize: 11, opacity: 0.88, mt: 0.3 }}>{tip.subtitle}</Typography>
      )}
    </Box>
  );
}

function SvgBarChart({
  data,
  height = 130,
  tooltipLabel = "Count",
}: {
  data: { label: string; value: number }[];
  height?: number;
  tooltipLabel?: string;
}) {
  const theme = useTheme();
  const [tip, setTip] = useState<HoverTip>(null);

  const w = 520;
  const h = height;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = data.length ? (w - pad * 2) / data.length : 1;

  const palette = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#14b8a6",
    "#f97316",
  ];

  // 🔥 Use theme-aware text color
  const labelColor =
    theme.palette.mode === "dark"
      ? theme.palette.grey[300]
      : theme.palette.grey[800];

  const axisColor =
    theme.palette.mode === "dark"
      ? theme.palette.grey[600]
      : theme.palette.grey[300];

  return (
    <Box sx={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block" }}
        onPointerLeave={() => setTip(null)}
      >
        {/* Axis */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke={axisColor}
        />

        {data.map((d, i) => {
          const barH = ((h - pad * 2) * d.value) / max;
          const x = pad + i * bw + 6;
          const y = h - pad - barH;
          const color = palette[i % palette.length];
          const barW = Math.max(10, bw - 12);

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={8}
                fill={color}
                opacity={0.95}
                onPointerMove={(e) => {
                  setTip({
                    x: (e as any).clientX,
                    y: (e as any).clientY,
                    title: d.label,
                    subtitle: `${tooltipLabel}: ${d.value}`,
                  });
                }}
                onPointerLeave={() => setTip(null)}
              />

              {/* Label */}
              <text
                x={x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                fontSize="11"
                fill={labelColor}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <TooltipBox tip={tip} />
    </Box>
  );
}

export default function NursePatientAdmissionPage() {
  const nav = useNavigate();
  const patientsQuery = useAllActivePatients();
  const admissionsQuery = useAllPatientAdmissions();

  const bedsAllQuery = useAllBeds();
  const wardsAllQuery = useAllWards();
  const deptsQuery = useAllDepartments();

  const createAdmission = useCreatePatientAdmission();
  const updateAdmission = useUpdatePatientAdmission();

  const busy =
    patientsQuery.isLoading ||
    admissionsQuery.isLoading ||
    bedsAllQuery.isLoading ||
    wardsAllQuery.isLoading ||
    deptsQuery.isLoading ||
    createAdmission.isPending ||
    updateAdmission.isPending;

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

  const summary = useMemo(() => {
    const total = admissions.length;
    const active = admissions.filter((a) => String(a.status ?? "").toUpperCase() === "ACTIVE").length;
    const discharged = admissions.filter((a) => String(a.status ?? "").toUpperCase() === "DISCHARGED").length;

    const pendingNurseConfirm = admissions.filter(
      (a) => String(a.status ?? "").toUpperCase() === "DISCHARGED" && !a.dischargedAt
    ).length;

    return { total, active, discharged, pendingNurseConfirm };
  }, [admissions]);

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
    const filtered = t
      ? baseList.filter((a) => matchesAdmission(a, t, patientById, bedById, wardById, deptById))
      : baseList;
    return sortAdmissions(filtered, sortKey, sortDir, patientById, bedById, wardById, deptById);
  }, [baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () => (selectedId ? filteredSorted.find((a) => a.id === selectedId) ?? null : null),
    [filteredSorted, selectedId]
  );

  const prescriptionsQuery = usePrescriptionsByAdmissionId(selected?.id);

  const prescriptions = prescriptionsQuery.data ?? [];

  const [viewOpen, setViewOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState<string>("");

  const refresh = () => admissionsQuery.refetch();



  const openNurseConfirmDischarge = (a: PatientAdmissionRes) => {
    setSelectedId(a.id);
    setDischargeNotes("");
    setDischargeOpen(true);
  };

  const submitNurseConfirmDischarge = async () => {
    if (!selected) return;

    const payload: PatientAdmissionReq = {
      patientId: selected.patientId,
      bedId: selected.bedId,
      queueId: (selected as any).queueId,
      status: "DISCHARGED",
      dischargeNotes: dischargeNotes || (selected as any).dischargeNotes || undefined,
      dischargedAt: dayjs().toISOString(),
      admittedAt: selected.admittedAt,
      nurseConfirmed: true,
      nurseConfirmedAt: dayjs().toISOString(),
    } as any;

    await updateAdmission.mutateAsync({ id: selected.id, payload } as any);
    setDischargeOpen(false);
  };

  const statusData = useMemo(
    () => [
      { label: "ACTIVE", value: summary.active },
      { label: "DISCH", value: summary.discharged },
      { label: "PENDING", value: summary.pendingNurseConfirm },
    ],
    [summary]
  );

  const nurseConfirmNeeded = (a: PatientAdmissionRes) =>
    String(a.status ?? "").toUpperCase() === "DISCHARGED" && !a.dischargedAt;

  const dischargeBtnEnabled = (a: PatientAdmissionRes) => nurseConfirmNeeded(a);

  const dischargeBtnHint = (a: PatientAdmissionRes) => {
    const st = String(a.status ?? "").toUpperCase();
    if (st === "ACTIVE") return "Doctor has not discharged yet.";
    if (st === "DISCHARGED" && a.dischargedAt) return "Already confirmed by nurse.";
    if (st === "DISCHARGED" && !a.dischargedAt) return "Doctor discharged. Nurse confirmation required.";
    return "Not available for this status.";
  };

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>
            Patient Admission Management
          </Typography>
          <Typography variant="body2" color="text.secondary" >
            Create • View • Nurse Confirm Discharge • Search • Sort • Summary
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => nav("/dashboard/nurse/patient-addmissions/new")} disabled={busy}>
            Create Admission
          </Button>
        </Stack>
      </Stack>

      {(patientsQuery.isError ||
        admissionsQuery.isError ||
        bedsAllQuery.isError ||
        wardsAllQuery.isError ||
        deptsQuery.isError ||
        createAdmission.isError ||
        updateAdmission.isError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(patientsQuery.error as any)?.message ??
              (admissionsQuery.error as any)?.message ??
              (bedsAllQuery.error as any)?.message ??
              (wardsAllQuery.error as any)?.message ??
              (deptsQuery.error as any)?.message ??
              (createAdmission.error as any)?.message ??
              (updateAdmission.error as any)?.message ??
              "Failed to load admission data."}
          </Alert>
        )}

      {busy && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={900}>Summary</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>
                    TOTAL ADMISSIONS
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.total}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(245,158,11,0.10)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>
                    CURRENTLY ADMITTED
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.active}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(34,197,94,0.10)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>
                    DISCHARGED (TOTAL)
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.discharged}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(239,68,68,0.08)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>
                    NEEDS NURSE CONFIRM
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.pendingNurseConfirm}</Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Status Distribution</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hover bars for exact counts
                </Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <SvgBarChart data={statusData} tooltipLabel="Admissions" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Note: <b>PENDING</b> = Doctor discharged, but nurse hasn’t confirmed (discharged date not set).
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                onChange={(e) => {
                  setTab(e.target.value as any);
                  setSelectedId(null);
                }}
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
                  label="Search (filters table)"
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
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch("");
                          setSuggestOpen(false);
                        }}
                      >
                        <ClearIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Box>

              <Popper
                open={suggestOpen && !!search.trim() && !!anchorEl}
                anchorEl={anchorEl}
                placement="bottom-start"
                style={{ zIndex: 1300, width: anchorWidth }}
              >
                <ClickAwayListener onClickAway={() => setSuggestOpen(false)}>
                  <Paper variant="elevation" sx={{ mt: 1, maxHeight: 280, overflowY: "auto" }}>
                    {suggestions.length === 0 ? (
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          No matches
                        </Typography>
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
                                setSelectedId(a.id);
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography fontWeight={800}>{name}</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {statusBadge(a.status as any)}
                                  {nurseConfirmNeeded(a) && (
                                    <Box
                                      sx={{
                                        px: 1,
                                        py: 0.4,
                                        borderRadius: 999,
                                        border: "1px dashed rgba(239,68,68,0.55)",
                                        color: "rgba(239,68,68,0.95)",
                                        fontSize: 12,
                                        fontWeight: 900,
                                      }}
                                    >
                                      NEEDS NURSE CONFIRM
                                    </Box>
                                  )}
                                </Stack>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Patient: {a.patientId ?? "—"} • {toDeptName(a, bedById, wardById, deptById)} •{" "}
                                {toWardName(a, bedById, wardById)} • Bed {toBedNo(a, bedById)} • {fmtDT(a.admittedAt)}
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
                <TextField
                  select
                  label="Sort by"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  fullWidth
                >
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
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              {admissionsQuery.isLoading ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8}>Loading…</TableCell>
                  </TableRow>
                </TableBody>
              ) : filteredSorted.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ borderBottom: "none", p: 0 }}>
                      <Stack
                        direction="column"
                        justifyContent="center"
                        alignItems="center"
                        spacing={2}
                        sx={{ py: 2, width: "100%", textAlign: "center" }}
                      >
                        <Avatar src={emptyBoxAsset} sx={{ width: 150, height: 150, mb: 1 }} />
                        <Typography sx={{ fontWeight: "bold", color: "gray" }}>No admission records</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {filteredSorted.slice(0, 500).map((a) => {
                    const isSelected = selectedId === a.id;
                    const pid = Number(a.patientId ?? 0);
                    const p = patientById.get(pid);
                    const patientName = p?.fullName ?? (a as any).patientName ?? "—";

                    return (
                      <TableRow
                        key={a.id}
                        hover
                        selected={isSelected}
                        onClick={() => setSelectedId(a.id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Stack spacing={0.2}>
                            <Typography fontWeight={800}>{patientName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Patient: {a.patientId ?? "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>{toDeptName(a, bedById, wardById, deptById)}</TableCell>
                        <TableCell>{toWardName(a, bedById, wardById)}</TableCell>
                        <TableCell>{toBedNo(a, bedById)}</TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {statusBadge(a.status as any)}
                            {nurseConfirmNeeded(a) && (
                              <Box
                                sx={{
                                  px: 1,
                                  py: 0.35,
                                  borderRadius: 999,
                                  border: "1px dashed rgba(239,68,68,0.55)",
                                  color: "rgba(239,68,68,0.95)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                NEEDS NURSE CONFIRM
                              </Box>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>{fmtDT(a.admittedAt)}</TableCell>
                        <TableCell>{fmtDT(a.dischargedAt)}</TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(a.id);
                                  setViewOpen(true);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={dischargeBtnHint(a)}>
                              <span>
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNurseConfirmDischarge(a);
                                  }}
                                  disabled={busy || !dischargeBtnEnabled(a)}
                                  color="success"
                                >
                                  <DoneAllIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
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

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Admission Details</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={2}>
              {(() => {
                const pid = Number(selected.patientId ?? 0);
                const p = patientById.get(pid);
                const patientName =
                  p?.fullName ?? (selected as any).patientName ?? "—";

                return (
                  <>
                    {/* Patient Header */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ gap: 1 }}
                    >
                      <Typography fontWeight={900}>
                        {patientName}
                      </Typography>

                      {statusBadge(selected.status as any)}
                    </Stack>

                    <Divider />

                    {/* Basic Admission Info */}
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <b>Admission ID:</b> {selected.id}
                        </Typography>
                        <Typography variant="body2">
                          <b>Patient ID:</b> {selected.patientId}
                        </Typography>
                        <Typography variant="body2">
                          <b>Department:</b>{" "}
                          {toDeptName(selected, bedById, wardById, deptById)}
                        </Typography>
                        <Typography variant="body2">
                          <b>Ward:</b>{" "}
                          {toWardName(selected, bedById, wardById)}
                        </Typography>
                        <Typography variant="body2">
                          <b>Bed:</b> {toBedNo(selected, bedById)}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <b>Admitted:</b> {fmtDT(selected.admittedAt)}
                        </Typography>
                        <Typography variant="body2">
                          <b>Discharged:</b> {fmtDT(selected.dischargedAt)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ mt: 1 }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                      <Typography fontWeight={900}>Prescriptions</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {prescriptions.length} prescription(s)
                      </Typography>
                    </Stack>

                    {prescriptionsQuery.isLoading ? (
                      <LinearProgress sx={{ mt: 1 }} />
                    ) : prescriptionsQuery.isError ? (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {(prescriptionsQuery.error as any)?.message ?? "Failed to load prescriptions."}
                      </Alert>
                    ) : prescriptions.length === 0 ? (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        No prescriptions available for this admission.
                      </Alert>
                    ) : (
                      <Stack spacing={1.2} sx={{ mt: 1 }}>
                        {prescriptions.map((pres) => (
                          <Card key={pres.id} variant="outlined">
                            <CardContent>
                              <Stack spacing={1}>
                                {/* Header */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                                  <Typography fontWeight={900}>Prescription #{pres.id}</Typography>
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Chip size="small" variant="outlined" label={(pres.type ?? "—").toUpperCase()} />
                                    <Chip size="small" variant="outlined" label={(pres.status ?? "—").toUpperCase()} />
                                  </Stack>
                                </Stack>

                                {/* Meta */}
                                <Grid container spacing={1}>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2">
                                      <b>Doctor:</b> {pres.doctorName ?? "—"}
                                    </Typography>
                                    <Typography variant="body2">
                                      <b>Queue ID:</b> {pres.queueId ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2">
                                      <b>Created:</b> {fmtDT(pres.createdAt)}
                                    </Typography>
                                    <Typography variant="body2">
                                      <b>Updated:</b> {fmtDT(pres.updatedAt)}
                                    </Typography>
                                  </Grid>
                                </Grid>

                                {pres.notes ? (
                                  <Alert severity="info" sx={{ py: 0.6 }}>
                                    <b>Notes:</b> {pres.notes}
                                  </Alert>
                                ) : null}

                                {/* Items */}
                                <Typography fontWeight={800} sx={{ mt: 0.5 }}>
                                  Items ({(pres.items ?? []).length})
                                </Typography>

                                <TableContainer component={Paper} variant="outlined">
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Medicine</TableCell>
                                        <TableCell>Dosage</TableCell>
                                        <TableCell>Frequency</TableCell>
                                        <TableCell>Days</TableCell>
                                        <TableCell>Instructions</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {(pres.items ?? []).length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={5}>No items</TableCell>
                                        </TableRow>
                                      ) : (
                                        (pres.items ?? []).map((it) => (
                                          <TableRow key={it.id}>
                                            <TableCell>{it.medicineName ?? "—"}</TableCell>
                                            <TableCell>{it.dosage ?? "—"}</TableCell>
                                            <TableCell>{it.frequency ?? "—"}</TableCell>
                                            <TableCell>{typeof it.durationDays === "number" ? it.durationDays : "—"}</TableCell>
                                            <TableCell>{it.instructions ?? "—"}</TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </>
                );
              })()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dischargeOpen} onClose={() => setDischargeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nurse Confirm Discharge</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No admission selected</Alert>
          ) : nurseConfirmNeeded(selected) ? (
            <Stack spacing={1.5}>
              <Card variant="outlined">
                <CardContent>
                  {(() => {
                    const pid = Number(selected.patientId ?? 0);
                    const p = patientById.get(pid);
                    const patientName = p?.fullName ?? (selected as any).patientName ?? "—";
                    return (
                      <>
                        <Typography fontWeight={900}>{patientName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Admission #{selected.id} • Patient #{selected.patientId}
                        </Typography>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {(selected as any)?.dischargeNotes && (
                <Alert severity="info">
                  <b>Doctor notes:</b> {String((selected as any).dischargeNotes).slice(0, 250)}
                </Alert>
              )}

              <TextField
                label="Nurse confirmation notes (optional)"
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                placeholder="e.g., belongings returned, discharge papers handed over..."
              />

              <Alert severity="warning">
                This will set the <b>discharged date/time</b> (nurse confirmation time).
              </Alert>
            </Stack>
          ) : (
            <Alert severity="warning">This admission is not waiting for nurse confirmation.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDischargeOpen(false)} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submitNurseConfirmDischarge}
            variant="contained"
            color="success"
            disabled={busy || !selected || !nurseConfirmNeeded(selected)}
          >
            Confirm Discharge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}