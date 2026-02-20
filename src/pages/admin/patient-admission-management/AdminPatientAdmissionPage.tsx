/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

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
  useDeletePatientAdmission,
  useUpdatePatientAdmission,
} from "../../../features/patient-admission/patientAdmission-service";

import type { PatientAdmissionRes } from "../../../features/patient-admission/types";
import { useNavigate } from "react-router-dom";

// ✅ Prescriptions
import {
  usePrescriptionsByAdmissionId,
  useDeletePrescription,
} from "../../../features/prescription/prescription-service";

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
  if (v === "TRANSFERRED") return <Box sx={{ ...base, bgcolor: "rgba(59,130,246,0.18)" }}>TRANSFERRED</Box>;
  return <Box sx={{ ...base, bgcolor: "rgba(148,163,184,0.18)" }}>—</Box>;
}

function toDeptName(
  a: PatientAdmissionRes,
  bedById: Map<number, BedRes>,
  wardById: Map<number, WardRes>,
  deptById: Map<number, DeptRes>
) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = (bed as any)?.wardId ? wardById.get(Number((bed as any).wardId)) : undefined;
  const dept = (ward as any)?.departmentId ? deptById.get(Number((ward as any).departmentId)) : undefined;
  return (dept as any)?.name ?? "—";
}
function toWardName(a: PatientAdmissionRes, bedById: Map<number, BedRes>, wardById: Map<number, WardRes>) {
  const bed = a.bedId ? bedById.get(Number(a.bedId)) : undefined;
  const ward = (bed as any)?.wardId ? wardById.get(Number((bed as any).wardId)) : undefined;
  return (ward as any)?.name ?? "—";
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
  const patient = patientById.get(pid);

  const patientName = safeLower((patient as any)?.fullName ?? (a as any).patientName ?? "");
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
    if (key === "admittedAt")
      return (dayjs(a.admittedAt ?? 0).valueOf() - dayjs(b.admittedAt ?? 0).valueOf()) * mul;

    if (key === "status") {
      const av = statusRank[String(a.status ?? "").toUpperCase()] ?? 999;
      const bv = statusRank[String(b.status ?? "").toUpperCase()] ?? 999;
      return (av - bv) * mul;
    }

    if (key === "patientName") {
      const ap = patientById.get(Number(a.patientId ?? 0));
      const bp = patientById.get(Number(b.patientId ?? 0));
      return (
        safeLower((ap as any)?.fullName ?? "").localeCompare(safeLower((bp as any)?.fullName ?? "")) * mul
      );
    }

    if (key === "patientId") return (Number(a.patientId ?? 0) - Number(b.patientId ?? 0)) * mul;

    if (key === "department") {
      return safeLower(toDeptName(a, bedById, wardById, deptById)).localeCompare(
        safeLower(toDeptName(b, bedById, wardById, deptById))
      ) * mul;
    }

    if (key === "ward") {
      return safeLower(toWardName(a, bedById, wardById)).localeCompare(
        safeLower(toWardName(b, bedById, wardById))
      ) * mul;
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
      {tip.subtitle && <Typography sx={{ fontSize: 11, opacity: 0.88, mt: 0.3 }}>{tip.subtitle}</Typography>}
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

  const palette = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316"];

  const labelColor = theme.palette.mode === "dark" ? theme.palette.grey[300] : theme.palette.grey[800];
  const axisColor = theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300];

  return (
    <Box sx={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }} onPointerLeave={() => setTip(null)}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={axisColor} />

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
              />
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

function SvgLineChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const theme = useTheme();
  const [tip, setTip] = useState<HoverTip>(null);

  const w = 520;
  const h = height;
  const padX = 28;
  const padY = 22;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;

  const axisColor = theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300];
  const labelColor = theme.palette.mode === "dark" ? theme.palette.grey[300] : theme.palette.grey[800];

  const xStep = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 1;

  const toXY = (i: number, v: number) => {
    const x = padX + i * xStep;
    const y = h - padY - ((h - padY * 2) * (v - min)) / (max - min || 1);
    return { x, y };
  };

  const path = data
    .map((d, i) => {
      const { x, y } = toXY(i, d.value);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <Box sx={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }} onPointerLeave={() => setTip(null)}>
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={axisColor} />
        <line x1={padX} y1={padY} x2={padX} y2={h - padY} stroke={axisColor} />

        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" opacity={0.9} />

        {data.map((d, i) => {
          const { x, y } = toXY(i, d.value);
          return (
            <g key={d.label}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill="#3b82f6"
                opacity={0.9}
                onPointerMove={(e) => {
                  setTip({
                    x: (e as any).clientX,
                    y: (e as any).clientY,
                    title: d.label,
                    subtitle: `Admissions: ${d.value}`,
                  });
                }}
              />
              {data.length <= 14 || i % 2 === 0 ? (
                <text x={x} y={h - 8} textAnchor="middle" fontSize="10" fill={labelColor} style={{ userSelect: "none" }}>
                  {d.label.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <TooltipBox tip={tip} />
    </Box>
  );
}

export default function AdminPatientAdmissionPage() {
  const nav = useNavigate();

  const patientsQuery = useAllActivePatients();
  const admissionsQuery = useAllPatientAdmissions();
  const bedsAllQuery = useAllBeds();
  const wardsAllQuery = useAllWards();
  const deptsQuery = useAllDepartments();

  const updateAdmission = useUpdatePatientAdmission();
  const deleteAdmission = useDeletePatientAdmission();

  // ✅ prescriptions (view + delete)
  const deletePrescription = useDeletePrescription();

  const busy =
    patientsQuery.isLoading ||
    admissionsQuery.isLoading ||
    bedsAllQuery.isLoading ||
    wardsAllQuery.isLoading ||
    deptsQuery.isLoading ||
    updateAdmission.isPending ||
    deleteAdmission.isPending ||
    deletePrescription.isPending;

  const patientById = useMemo(() => {
    const m = new Map<number, PatientRes>();
    (patientsQuery.data ?? []).forEach((p) => m.set(Number((p as any).id), p));
    return m;
  }, [patientsQuery.data]);

  const bedById = useMemo(() => {
    const m = new Map<number, BedRes>();
    (bedsAllQuery.data ?? []).forEach((b) => m.set(Number((b as any).id), b));
    return m;
  }, [bedsAllQuery.data]);

  const wardById = useMemo(() => {
    const m = new Map<number, WardRes>();
    (wardsAllQuery.data ?? []).forEach((w) => m.set(Number((w as any).id), w));
    return m;
  }, [wardsAllQuery.data]);

  const deptById = useMemo(() => {
    const m = new Map<number, DeptRes>();
    (deptsQuery.data ?? []).forEach((d) => m.set(Number((d as any).id), d));
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

  const statusData = useMemo(
    () => [
      { label: "ACTIVE", value: summary.active },
      { label: "DISCH", value: summary.discharged },
      { label: "PENDING", value: summary.pendingNurseConfirm },
    ],
    [summary]
  );

  const deptDist = useMemo(() => {
    const map = new Map<string, number>();
    admissions.forEach((a) => {
      const k = toDeptName(a, bedById, wardById, deptById);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()]
      .filter(([k]) => k && k !== "—")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  }, [admissions, bedById, wardById, deptById]);

  const last14Days = useMemo(() => {
    const days = 14;
    const end = dayjs().startOf("day");
    const start = end.subtract(days - 1, "day");

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) buckets.set(start.add(i, "day").format("YYYY-MM-DD"), 0);

    admissions.forEach((a) => {
      const d = dayjs(a.admittedAt ?? null);
      if (!d.isValid()) return;
      const key = d.startOf("day").format("YYYY-MM-DD");
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return [...buckets.entries()].map(([label, value]) => ({ label, value }));
  }, [admissions]);

  type TabKey = "ACTIVE" | "PENDING" | "DISCHARGED" | "ALL";
  const [tab, setTab] = useState<TabKey>("ALL");

  const baseList = useMemo(() => {
    const all = admissions;
    if (tab === "ACTIVE") return all.filter((a) => String(a.status ?? "").toUpperCase() === "ACTIVE");
    if (tab === "PENDING") return all.filter((a) => String(a.status ?? "").toUpperCase() === "DISCHARGED" && !a.dischargedAt);
    if (tab === "DISCHARGED") return all.filter((a) => String(a.status ?? "").toUpperCase() === "DISCHARGED" && !!a.dischargedAt);
    return all;
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

  const tableSorted = useMemo(() => {
    return sortAdmissions(baseList, sortKey, sortDir, patientById, bedById, wardById, deptById);
  }, [baseList, sortKey, sortDir, patientById, bedById, wardById, deptById]);

  const suggestions = useMemo(() => {
    return buildSuggestions(baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById);
  }, [baseList, search, sortKey, sortDir, patientById, bedById, wardById, deptById]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () => (selectedId ? admissions.find((a) => Number((a as any).id) === Number(selectedId)) ?? null : null),
    [admissions, selectedId]
  );

  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ✅ load prescriptions in details popup
  const prescriptionsQuery = usePrescriptionsByAdmissionId(selected?.id);

  const refresh = () => admissionsQuery.refetch();

  const submitDelete = async () => {
    if (!selected) return;
    await deleteAdmission.mutateAsync(Number(selected.id));
    await admissionsQuery.refetch();
    setDeleteOpen(false);
    setSelectedId(null);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>Admin Admission Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Dashboard • View (with prescriptions) • Delete • Search Suggestions • Sort
          </Typography>
        </Stack>

        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={refresh} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {(patientsQuery.isError ||
        admissionsQuery.isError ||
        bedsAllQuery.isError ||
        wardsAllQuery.isError ||
        deptsQuery.isError ||
        updateAdmission.isError ||
        deleteAdmission.isError ||
        deletePrescription.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientsQuery.error as any)?.message ??
            (admissionsQuery.error as any)?.message ??
            (bedsAllQuery.error as any)?.message ??
            (wardsAllQuery.error as any)?.message ??
            (deptsQuery.error as any)?.message ??
            (updateAdmission.error as any)?.message ??
            (deleteAdmission.error as any)?.message ??
            (deletePrescription.error as any)?.message ??
            "Failed to load admission data."}
        </Alert>
      )}

      {busy && <LinearProgress sx={{ mb: 2 }} />}

      {/* ---------------- Dashboard ---------------- */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={900}>Summary</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>TOTAL</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.total}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(245,158,11,0.10)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>ACTIVE</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.active}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(34,197,94,0.10)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>DISCHARGED</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.discharged}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(239,68,68,0.08)" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 700 }}>PENDING NURSE CONFIRM</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{summary.pendingNurseConfirm}</Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={900}>Status Distribution</Typography>
                <Typography variant="body2" color="text.secondary">Hover for exact counts</Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <SvgBarChart data={statusData} tooltipLabel="Admissions" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Note: <b>PENDING</b> = status is DISCHARGED but dischargedAt is not set.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Top Departments</Typography>
                <Typography variant="body2" color="text.secondary">Top 8</Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              {deptDist.length === 0 ? <Alert severity="info">No department data</Alert> : <SvgBarChart data={deptDist} tooltipLabel="Admissions" height={150} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Admissions Trend (Last 14 days)</Typography>
                <Typography variant="body2" color="text.secondary">Daily count</Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <SvgLineChart data={last14Days} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---------------- Table + Search Suggestions ---------------- */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
            <Typography fontWeight={900}>Admissions</Typography>
            <Typography variant="body2" color="text.secondary">
              Showing <b>{Math.min(tableSorted.length, 500)}</b> / {tableSorted.length}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box ref={searchRef}>
                <TextField
                  label="Search (suggestions only)"
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
                        <Typography variant="body2" color="text.secondary">No matches</Typography>
                      </Box>
                    ) : (
                      <Stack divider={<Divider />} sx={{ p: 0.5 }}>
                        {suggestions.map((a) => {
                          const pid = Number(a.patientId ?? 0);
                          const p = patientById.get(pid);
                          const name = (p as any)?.fullName ?? (a as any).patientName ?? "—";
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
                                {statusBadge(a.status as any)}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Admission #{a.id} • Patient: {a.patientId ?? "—"} • {toDeptName(a, bedById, wardById, deptById)} •{" "}
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

                <TextField
                  select
                  size="small"
                  label="View"
                  value={tab}
                  onChange={(e) => {
                    setTab(e.target.value as any);
                    setSelectedId(null);
                  }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="PENDING">Pending discharge</MenuItem>
                  <MenuItem value="DISCHARGED">Discharged</MenuItem>
                  <MenuItem value="ALL">All</MenuItem>
                </TextField>
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
              ) : tableSorted.length === 0 ? (
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
                  {tableSorted.slice(0, 500).map((a) => {
                    const isSelected = selectedId === a.id;
                    const pid = Number(a.patientId ?? 0);
                    const p = patientById.get(pid);
                    const patientName = (p as any)?.fullName ?? (a as any).patientName ?? "—";
                    const isActive = String(a.status ?? "").toUpperCase() === "ACTIVE";

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
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View (with prescriptions)">
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

                            {isActive && (
                              <Tooltip title="Edit Admission">
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nav(`/dashboard/admin/patient-addmissions/${a.id}/edit`);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title="Delete">
                              <IconButton
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(a.id);
                                  setDeleteOpen(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
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

      {/* ======================= DETAILS POPUP (PRESCRIPTIONS AS TABLES) ======================= */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Admission Details</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1.6}>
              {(() => {
                const pid = Number(selected.patientId ?? 0);
                const p = patientById.get(pid);
                const patientName = (p as any)?.fullName ?? (selected as any).patientName ?? "—";

                return (
                  <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                      <Typography fontWeight={900}>{patientName}</Typography>
                      {statusBadge(selected.status as any)}
                    </Stack>

                    <Divider />

                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2"><b>Admission ID:</b> {selected.id}</Typography>
                        <Typography variant="body2"><b>Patient ID:</b> {selected.patientId}</Typography>
                        <Typography variant="body2"><b>Department:</b> {toDeptName(selected, bedById, wardById, deptById)}</Typography>
                        <Typography variant="body2"><b>Ward:</b> {toWardName(selected, bedById, wardById)}</Typography>
                        <Typography variant="body2"><b>Bed:</b> {toBedNo(selected, bedById)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2"><b>Admitted:</b> {fmtDT(selected.admittedAt)}</Typography>
                        <Typography variant="body2"><b>Discharged:</b> {fmtDT(selected.dischargedAt)}</Typography>
                        {(selected as any)?.dischargeNotes ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <b>Notes:</b> {String((selected as any).dischargeNotes).slice(0, 350)}
                          </Alert>
                        ) : null}
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1 }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                      <Typography fontWeight={900}>Prescriptions</Typography>
                      <Button size="small" variant="outlined" onClick={() => prescriptionsQuery.refetch()} disabled={prescriptionsQuery.isLoading}>
                        Refresh
                      </Button>
                    </Stack>

                    {prescriptionsQuery.isLoading ? (
                      <LinearProgress />
                    ) : prescriptionsQuery.isError ? (
                      <Alert severity="error">{(prescriptionsQuery.error as any)?.message ?? "Failed to load prescriptions"}</Alert>
                    ) : (prescriptionsQuery.data ?? []).length === 0 ? (
                      <Alert severity="info">No prescriptions for this admission</Alert>
                    ) : (
                      <Stack spacing={1.2}>
                        {(prescriptionsQuery.data ?? []).map((rx: any) => (
                          <Paper key={rx.id} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                              <Stack spacing={0.2}>
                                <Typography fontWeight={800}>Prescription #{rx.id}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Doctor: {rx.doctorName ?? "—"} • Type: {rx.type ?? "—"} • Status: {rx.status ?? "—"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Created: {fmtDT(rx.createdAt)} • Updated: {fmtDT(rx.updatedAt)}
                                </Typography>
                                {rx.notes ? (
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    <b>Notes:</b> {String(rx.notes).slice(0, 250)}
                                  </Typography>
                                ) : null}
                              </Stack>

                              {/* ✅ NO "Edit" button here (per your request) */}
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={deletePrescription.isPending}
                                onClick={async () => {
                                  await deletePrescription.mutateAsync(Number(rx.id));
                                  await prescriptionsQuery.refetch();
                                }}
                              >
                                Delete Prescription
                              </Button>
                            </Stack>

                            <Divider sx={{ my: 1 }} />

                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Medicine</TableCell>
                                    <TableCell>Dosage</TableCell>
                                    <TableCell>Frequency</TableCell>
                                    <TableCell>Duration (Days)</TableCell>
                                    <TableCell>Instructions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(rx.items ?? []).length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary">No items</Typography>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    (rx.items ?? []).map((it: any) => (
                                      <TableRow key={it.id}>
                                        <TableCell>{it.medicineName ?? "—"}</TableCell>
                                        <TableCell>{it.dosage ?? "—"}</TableCell>
                                        <TableCell>{it.frequency ?? "—"}</TableCell>
                                        <TableCell>{it.durationDays ?? "—"}</TableCell>
                                        <TableCell>{it.instructions ?? "—"}</TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Paper>
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
          <Button onClick={() => setViewOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Delete Dialog ---------------- */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Admission</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1}>
              <Alert severity="warning">
                This will permanently delete Admission #{selected.id}. This action cannot be undone.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Patient ID: <b>{selected.patientId}</b> • Status: <b>{String(selected.status ?? "—").toUpperCase()}</b>
              </Typography>
              {deleteAdmission.isError && (
                <Alert severity="error">{(deleteAdmission.error as any)?.message ?? "Delete failed."}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} variant="outlined" disabled={busy}>Cancel</Button>
          <Button onClick={submitDelete} variant="contained" color="error" disabled={busy || !selected}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


