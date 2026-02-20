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
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

import dayjs from "dayjs";

import {
  useAllPatientQueues,
  useDeletePatientQueue,
  useUpdatePatientQueue,
} from "../../features/patient-queue/patientQueue-service";
import type {
  PatientQueueReq,
  PatientQueueRes,
  QueuePriority,
  QueueStatus,
} from "../../features/patient-queue/types";

import emptyBoxAsset from "../../assets/static/symbols/empty-box.png";

type SortKey =
  | "createdAt"
  | "priority"
  | "status"
  | "patientName"
  | "patientId"
  | "triageLevel";
type SortDir = "asc" | "desc";

const PRIORITIES: QueuePriority[] = ["NORMAL", "CRITICAL", "NON_CRITICAL"];
const STATUSES: QueueStatus[] = ["WAITING", "ADMITTED", "OUTPATIENT", "CANCELLED"];

function fmtDT(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : v;
}

function safeLower(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function priorityChip(p?: QueuePriority) {
  const v = (p ?? "NORMAL").toUpperCase();
  if (v === "CRITICAL") return <Chip size="small" color="error" label="CRITICAL" />;
  if (v === "NON_CRITICAL") return <Chip size="small" color="success" label="NON-CRITICAL" />;
  return <Chip size="small" variant="outlined" label="NORMAL" />;
}

function statusChip(s?: QueueStatus) {
  const v = (s ?? "WAITING").toUpperCase();
  if (v === "WAITING") return <Chip size="small" color="info" label="WAITING" />;
  if (v === "ADMITTED") return <Chip size="small" color="warning" label="ADMITTED" />;
  if (v === "OUTPATIENT") return <Chip size="small" color="success" label="OUTPATIENT" />;
  if (v === "CANCELLED") return <Chip size="small" color="default" label="CANCELLED" />;
  return <Chip size="small" variant="outlined" label={v || "—"} />;
}

function matchesQueue(q: PatientQueueRes, term: string) {
  const t = safeLower(term);
  if (!t) return true;

  const name = safeLower(q.patientName);
  const pid = String(q.patientId ?? "");
  const triage = safeLower(String((q as any).triageLevel ?? q.triageLevel ?? ""));
  const status = safeLower(String(q.status ?? ""));
  const pr = safeLower(String(q.priority ?? ""));

  return name.includes(t) || pid.includes(t) || triage.includes(t) || status.includes(t) || pr.includes(t);
}

function sortQueues(list: PatientQueueRes[], key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  const priRank: Record<string, number> = { CRITICAL: 0, NON_CRITICAL: 1, NORMAL: 2 };
  const stRank: Record<string, number> = { WAITING: 0, ADMITTED: 1, OUTPATIENT: 2, CANCELLED: 3 };

  return [...list].sort((a, b) => {
    if (key === "createdAt") {
      const av = dayjs(a.createdAt ?? 0).valueOf();
      const bv = dayjs(b.createdAt ?? 0).valueOf();
      return (av - bv) * mul;
    }
    if (key === "priority") {
      const av = priRank[String(a.priority ?? "NORMAL").toUpperCase()] ?? 999;
      const bv = priRank[String(b.priority ?? "NORMAL").toUpperCase()] ?? 999;
      return (av - bv) * mul;
    }
    if (key === "status") {
      const av = stRank[String(a.status ?? "WAITING").toUpperCase()] ?? 999;
      const bv = stRank[String(b.status ?? "WAITING").toUpperCase()] ?? 999;
      return (av - bv) * mul;
    }
    if (key === "patientName") {
      const av = safeLower(a.patientName);
      const bv = safeLower(b.patientName);
      return av.localeCompare(bv) * mul;
    }
    if (key === "patientId") {
      const av = Number(a.patientId ?? 0);
      const bv = Number(b.patientId ?? 0);
      return (av - bv) * mul;
    }
    // triageLevel
    const av = Number((a as any).triageLevel ?? (a as any).triage?.level ?? a.triageLevel ?? 9999);
    const bv = Number((b as any).triageLevel ?? (b as any).triage?.level ?? b.triageLevel ?? 9999);
    return (av - bv) * mul;
  });
}

function buildSuggestions(list: PatientQueueRes[], term: string, sortKey: SortKey, sortDir: SortDir) {
  const t = safeLower(term);
  if (!t) return [];
  return sortQueues(list.filter((q) => matchesQueue(q, t)), sortKey, sortDir).slice(0, 8);
}

function isActiveQueue(q: PatientQueueRes) {
  const s = String(q.status ?? "WAITING").toUpperCase();
  if (s === "WAITING") return true;
  if (s === "ADMITTED") return q.admitted !== true;
  return false;
}

function isHistoryQueue(q: PatientQueueRes) {
  const s = String(q.status ?? "WAITING").toUpperCase();
  if (s === "OUTPATIENT" || s === "CANCELLED") return true;
  if (s === "ADMITTED") return q.admitted === true;
  return false;
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

type HoverTip = {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
} | null;

function TooltipBox({ tip }: { tip: HoverTip }) {
  if (!tip) return null;

  return (
    <Box
      sx={{
        position: "fixed",               
        left: tip.x + 14,                
        top: tip.y + 14,
        pointerEvents: "none",           
        zIndex: 2000,
        bgcolor: "rgba(25,25,25,0.92)",
        color: "#fff",
        px: 1.2,
        py: 0.8,
        borderRadius: 1.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        maxWidth: 260,
        backdropFilter: "blur(4px)",
        transition: "transform 0.02s linear",
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
        {tip.title}
      </Typography>
      {tip.subtitle && (
        <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.3 }}>
          {tip.subtitle}
        </Typography>
      )}
    </Box>
  );
}



export function SvgBarChart({
  title,
  items,
  height = 180,
  tooltipLabel = "Count",
}: {
  title: string;
  items: { label: string; value: number }[];
  height?: number;
  tooltipLabel?: string;
}) {
  const maxV = Math.max(1, ...items.map((x) => x.value));
  const w = 560;
  const pad = 28;
  const innerW = w - pad * 2;
  const innerH = height - pad * 2;
  const gap = 10;
  const barW = items.length ? (innerW - gap * (items.length - 1)) / items.length : innerW;

  const palette = ["#1976d2", "#9c27b0", "#2e7d32", "#ed6c02", "#d32f2f", "#0288d1", "#6d4c41"];

  const [tip, setTip] = useState<HoverTip>(null);


  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={900} sx={{ mb: 1 }}>
          {title}
        </Typography>

        <Box sx={{ width: "100%", overflowX: "auto", position: "relative" }}>
          <TooltipBox tip={tip} />

          <svg
            width={w}
            height={height}
            role="img"
            aria-label={title}
            onMouseLeave={() => setTip(null)}
          >
            <line x1={pad} y1={pad + innerH} x2={pad + innerW} y2={pad + innerH} stroke="#9e9e9e" opacity={0.6} />

            {items.map((it, i) => {
              const h = (it.value / maxV) * innerH;
              const x = pad + i * (barW + gap);
              const y = pad + (innerH - h);
              const color = palette[i % palette.length];

              return (
                <g
                  key={it.label}
                  onMouseMove={(e) => {
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `${it.label}`,
                      subtitle: `${tooltipLabel}: ${it.value}`,
                    });
                  }}

                >
                  <rect x={x} y={y} width={barW} height={h} rx={10} fill={color} opacity={0.92} />
                  <rect x={x} y={y} width={barW} height={Math.min(10, h)} rx={10} fill="#ffffff" opacity={0.18} />

                  <text x={x + barW / 2} y={pad + innerH + 16} textAnchor="middle" fontSize="12" fill="#616161">
                    {it.label}
                  </text>
                  <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="12" fill="#212121" fontWeight={700}>
                    {it.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SvgLineChart({
  title,
  points,
  height = 180,
  tooltipLabel = "Count",
}: {
  title: string;
  points: { label: string; value: number }[];
  height?: number;
  tooltipLabel?: string;
}) {
  const w = 560;
  const pad = 28;
  const innerW = w - pad * 2;
  const innerH = height - pad * 2;
  const maxV = Math.max(1, ...points.map((p) => p.value));

  const start = "#1976d2";
  const end = "#d32f2f";

  const toXY = (idx: number, v: number) => {
    const x = pad + (points.length <= 1 ? 0 : (idx / (points.length - 1)) * innerW);
    const y = pad + (innerH - (v / maxV) * innerH);
    return { x, y };
  };

  const d = points
    .map((p, i) => {
      const { x, y } = toXY(i, p.value);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaD =
    points.length === 0 ? "" : `${d} L ${pad + innerW} ${pad + innerH} L ${pad} ${pad + innerH} Z`;

  const [tip, setTip] = useState<HoverTip>(null);


  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={900} sx={{ mb: 1 }}>
          {title}
        </Typography>

        <Box sx={{ width: "100%", overflowX: "auto", position: "relative" }}>
          <TooltipBox tip={tip} />

          <svg width={w} height={height} role="img" aria-label={title} onMouseLeave={() => setTip(null)}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={start} />
                <stop offset="100%" stopColor={end} />
              </linearGradient>

              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={start} stopOpacity={0.25} />
                <stop offset="100%" stopColor={end} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <line x1={pad} y1={pad + innerH} x2={pad + innerW} y2={pad + innerH} stroke="#9e9e9e" opacity={0.6} />

            {points.length > 1 && <path d={areaD} fill="url(#areaGrad)" stroke="none" />}

            <path d={d} fill="none" stroke="url(#lineGrad)" strokeWidth={3} strokeLinecap="round" />

            {points.map((p, i) => {
              const { x, y } = toXY(i, p.value);
              return (
                <g
                  key={p.label}
                  onMouseMove={(e) => {
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `${p.label}`,
                      subtitle: `${tooltipLabel}: ${p.value}`,
                    });
                  }}

                >
                  <circle cx={x} cy={y} r={9} fill="#000" opacity={0.06} />
                  <circle cx={x} cy={y} r={6} fill="#fff" />
                  <circle cx={x} cy={y} r={4} fill="url(#lineGrad)" opacity={0.95} />

                  <text x={x} y={pad + innerH + 16} textAnchor="middle" fontSize="12" fill="#616161">
                    {p.label}
                  </text>
                  <text x={x} y={y - 10} textAnchor="middle" fontSize="12" fill="#212121" fontWeight={700}>
                    {p.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
      </CardContent>
    </Card>
  );
}


export default function AdminPatientQueuePage() {
  const queuesQuery = useAllPatientQueues();
  const updateQueue = useUpdatePatientQueue();
  const deleteQueue = useDeletePatientQueue();

  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);

  type TabKey = "ACTIVE" | "HISTORY" | "ALL";
  const [tab, setTab] = useState<TabKey>("ALL");

  const baseList = useMemo(() => {
    if (tab === "ACTIVE") return queues.filter(isActiveQueue);
    if (tab === "HISTORY") return queues.filter(isHistoryQueue);
    return queues;
  }, [queues, tab]);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
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
    () => buildSuggestions(baseList, search, sortKey, sortDir),
    [baseList, search, sortKey, sortDir]
  );

  const filteredSorted = useMemo(() => {
    const t = safeLower(search);
    const filtered = t ? baseList.filter((q) => matchesQueue(q, t)) : baseList;
    return sortQueues(filtered, sortKey, sortDir);
  }, [baseList, search, sortKey, sortDir]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () => (selectedId ? filteredSorted.find((q) => q.id === selectedId) ?? null : null),
    [filteredSorted, selectedId]
  );

  const [viewOpen, setViewOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [draftPriority, setDraftPriority] = useState<QueuePriority>("NORMAL");
  const [draftStatus, setDraftStatus] = useState<QueueStatus>("WAITING");
  const [draftAdmitted, setDraftAdmitted] = useState<boolean>(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const busy = queuesQuery.isLoading || updateQueue.isPending || deleteQueue.isPending;

  const openEdit = (q: PatientQueueRes) => {
    setSelectedId(q.id);
    setDraftPriority((q.priority ?? "NORMAL") as QueuePriority);
    setDraftStatus((q.status ?? "WAITING") as QueueStatus);
    setDraftAdmitted(Boolean(q.admitted));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;

    const payload: PatientQueueReq = {
      patientId: selected.patientId,
      triageId: (selected as any).triageId,
      priority: draftPriority,
      status: draftStatus,
      admitted: draftAdmitted,
    } as any;

    await updateQueue.mutateAsync({ id: selected.id, payload });
    setEditOpen(false);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await deleteQueue.mutateAsync(selected.id);
    setDeleteOpen(false);
    setSelectedId(null);
  };

  const analysis = useMemo(() => {
    const all = queues;
    const total = all.length;

    const waiting = all.filter((q) => String(q.status ?? "").toUpperCase() === "WAITING").length;
    const admittedAll = all.filter((q) => String(q.status ?? "").toUpperCase() === "ADMITTED").length;

    const needsNurseConfirm = all.filter(
      (q) => String(q.status ?? "").toUpperCase() === "ADMITTED" && q.admitted !== true
    ).length;

    const confirmedAdmit = all.filter(
      (q) => String(q.status ?? "").toUpperCase() === "ADMITTED" && q.admitted === true
    ).length;

    const outpatient = all.filter((q) => String(q.status ?? "").toUpperCase() === "OUTPATIENT").length;
    const cancelled = all.filter((q) => String(q.status ?? "").toUpperCase() === "CANCELLED").length;

    const critical = all.filter((q) => String(q.priority ?? "").toUpperCase() === "CRITICAL").length;
    const nonCritical = all.filter((q) => String(q.priority ?? "").toUpperCase() === "NON_CRITICAL").length;
    const normal = all.filter((q) => String(q.priority ?? "").toUpperCase() === "NORMAL").length;

    const active = all.filter(isActiveQueue).length;
    const history = all.filter(isHistoryQueue).length;

    const triageLevels = [0, 1, 2, 3, 4, 5];
    const triageCounts = triageLevels.map((lvl) => ({
      lvl,
      count: all.filter((q) => Number((q as any).triageLevel ?? (q as any).triage?.level ?? q.triageLevel) === lvl)
        .length,
    }));
    const triageKnownTotal = triageCounts.reduce((s, x) => s + x.count, 0);

    const waitingItems = all
      .filter((q) => String(q.status ?? "").toUpperCase() === "WAITING")
      .map((q) => {
        const t = dayjs(q.createdAt ?? 0).valueOf();
        return Number.isFinite(t) ? Math.max(0, dayjs().valueOf() - t) : 0;
      })
      .filter((ms) => ms > 0)
      .sort((a, b) => a - b);

    const avgWaitMin =
      waitingItems.length === 0
        ? 0
        : Math.round(waitingItems.reduce((a, b) => a + b, 0) / waitingItems.length / 60000);

    const p50WaitMin =
      waitingItems.length === 0 ? 0 : Math.round(waitingItems[Math.floor(waitingItems.length * 0.5)] / 60000);

    const p90WaitMin =
      waitingItems.length === 0 ? 0 : Math.round(waitingItems[Math.floor(waitingItems.length * 0.9)] / 60000);

    const days = Array.from({ length: 7 }).map((_, i) => dayjs().startOf("day").subtract(6 - i, "day"));
    const last7 = days.map((d) => {
      const start = d.valueOf();
      const end = d.add(1, "day").valueOf();
      const count = all.filter((q) => {
        const t = dayjs(q.createdAt ?? 0).valueOf();
        return t >= start && t < end;
      }).length;
      return { label: d.format("MM/DD"), count };
    });

    const last7Total = last7.reduce((s, x) => s + x.count, 0);

    return {
      total,
      active,
      history,
      waiting,
      admittedAll,
      needsNurseConfirm,
      confirmedAdmit,
      outpatient,
      cancelled,
      critical,
      nonCritical,
      normal,
      triageCounts,
      triageKnownTotal,
      avgWaitMin,
      p50WaitMin,
      p90WaitMin,
      last7,
      last7Total,
    };
  }, [queues]);

  const refresh = () => {
    queuesQuery.refetch();
  };

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>
            Patient Queue (Admin)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View • Edit • Delete • Search • Sort • Analysis Dashboard
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Chip label="Admin View" variant="outlined" />
        </Stack>
      </Stack>

      {(queuesQuery.isError || updateQueue.isError || deleteQueue.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(queuesQuery.error as any)?.message ??
            (updateQueue.error as any)?.message ??
            (deleteQueue.error as any)?.message ??
            "Failed to load queue data."}
        </Alert>
      )}

      {queuesQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack spacing={0.2}>
              <Typography fontWeight={900}>Analysis Dashboard</Typography>
              <Typography variant="body2" color="text.secondary">
                Overview • Distribution • Wait-time • 7-day trend
              </Typography>
            </Stack>
            <Chip size="small" label={`Total: ${analysis.total}`} />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Active vs History
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    {analysis.active} Active
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analysis.history} History
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.8}>
                    <Typography variant="body2">WAITING: {analysis.waiting}</Typography>
                    <Typography variant="body2">ADMITTED: {analysis.admittedAll}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Priority Mix
                  </Typography>
                  <Stack spacing={0.8} sx={{ mt: 0.7 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>CRITICAL</Typography>
                      <Typography fontWeight={900}>{analysis.critical}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>NON-CRITICAL</Typography>
                      <Typography fontWeight={900}>{analysis.nonCritical}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>NORMAL</Typography>
                      <Typography fontWeight={900}>{analysis.normal}</Typography>
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Critical share: {pct(analysis.critical, analysis.total)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Admissions State
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    {analysis.confirmedAdmit} Confirmed
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analysis.needsNurseConfirm} Need nurse confirm
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.6}>
                    <Typography variant="body2">OUTPATIENT: {analysis.outpatient}</Typography>
                    <Typography variant="body2">CANCELLED: {analysis.cancelled}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    WAITING Time (minutes)
                  </Typography>
                  <Typography variant="h6" fontWeight={900}>
                    Avg: {analysis.avgWaitMin}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.7 }}>
                    <Chip size="small" label={`P50: ${analysis.p50WaitMin}`} />
                    <Chip size="small" label={`P90: ${analysis.p90WaitMin}`} />
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Based on current WAITING items only
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={900}>Triage Level Distribution</Typography>
                    <Chip size="small" label={`Known: ${analysis.triageKnownTotal}`} />
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  {analysis.triageKnownTotal === 0 ? (
                    <Alert severity="info">No triage level data found in queue records.</Alert>
                  ) : (
                    <Stack spacing={1}>
                      {analysis.triageCounts
                        .filter((x) => x.count > 0)
                        .map((x) => (
                          <Box key={x.lvl}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="body2">Level {x.lvl}</Typography>
                              <Typography variant="body2" fontWeight={800}>
                                {x.count} ({pct(x.count, analysis.triageKnownTotal)}%)
                              </Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct(x.count, analysis.triageKnownTotal)} />
                          </Box>
                        ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <SvgBarChart
                title="Status Distribution"
                items={[
                  { label: "WAIT", value: analysis.waiting },
                  { label: "ADM", value: analysis.admittedAll },
                  { label: "OUT", value: analysis.outpatient },
                  { label: "CAN", value: analysis.cancelled },
                ]}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 12 }}>
              <SvgLineChart
                title="Last 7 Days (Created)"
                points={analysis.last7.map((x) => ({ label: x.label, value: x.count }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
              <Typography fontWeight={900}>Queue Records</Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select
                  size="small"
                  label="View"
                  value={tab}
                  onChange={(e) => {
                    setTab(e.target.value as any);
                    setSelectedId(null);
                  }}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="HISTORY">History</MenuItem>
                  <MenuItem value="ALL">All</MenuItem>
                </TextField>

                <Chip size="small" label={`${filteredSorted.length} item(s)`} />
              </Stack>
            </Stack>

            <Divider />

            <Grid container spacing={1.2} alignItems="center" sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box ref={searchRef}>
                  <TextField
                    label="Search"
                    placeholder="patient name / patientId / triage / priority / status"
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
                          {suggestions.map((q) => (
                            <Box
                              key={q.id}
                              sx={{ p: 1, cursor: "pointer" }}
                              onClick={() => {
                                setSuggestOpen(false);
                                setSelectedId(q.id);
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography fontWeight={800}>{q.patientName ?? "—"}</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {priorityChip(q.priority)}
                                  {statusChip(q.status)}
                                </Stack>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Patient: {q.patientId ?? "—"} • Triage: {(q as any).triageLevel ?? (q as any).triage?.level ?? q.triageLevel ?? "—"} •{" "}
                                {fmtDT(q.createdAt)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  </ClickAwayListener>
                </Popper>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField select label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} fullWidth>
                    <MenuItem value="createdAt">Created</MenuItem>
                    <MenuItem value="patientName">Patient Name</MenuItem>
                    <MenuItem value="patientId">Patient ID</MenuItem>
                    <MenuItem value="triageLevel">Triage Level</MenuItem>
                    <MenuItem value="priority">Priority</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                  </TextField>

                  <Tooltip title={sortDir === "asc" ? "Ascending" : "Descending"}>
                    <IconButton onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                      {sortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {!queuesQuery.isLoading && filteredSorted.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No records in <b>{tab}</b>. Try switching to <b>ALL</b> or <b>HISTORY</b>.
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={() => setTab("ALL")}>
                  ALL
                </Button>
                <Button size="small" variant="outlined" onClick={() => setTab("ACTIVE")}>
                  ACTIVE
                </Button>
                <Button size="small" variant="outlined" onClick={() => setTab("HISTORY")}>
                  HISTORY
                </Button>
              </Stack>
            </Alert>
          )}

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Admitted?</TableCell>
                  <TableCell>Triage</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              {queuesQuery.isLoading ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                </TableBody>
              ) : filteredSorted.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderBottom: "none", p: 0 }}>
                      <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} sx={{ py: 2, width: "100%", textAlign: "center" }}>
                        <Avatar src={emptyBoxAsset} sx={{ width: 150, height: 150, mb: 1 }} />
                        <Typography sx={{ fontWeight: "bold", color: "gray" }}>No queue records</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {filteredSorted.slice(0, 500).map((q) => {
                    const isSelected = selectedId === q.id;
                    return (
                      <TableRow key={q.id} hover selected={isSelected} onClick={() => setSelectedId(q.id)} sx={{ cursor: "pointer" }}>
                        <TableCell>
                          <Stack spacing={0.2}>
                            <Typography fontWeight={800}>{q.patientName ?? "—"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Patient: {q.patientId ?? "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>{priorityChip(q.priority)}</TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {statusChip(q.status)}
                            {String(q.status ?? "").toUpperCase() === "ADMITTED" && q.admitted !== true && (
                              <Chip size="small" color="warning" variant="outlined" label="NEEDS NURSE CONFIRM" />
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>{q.admitted ? "Yes" : "No"}</TableCell>
                        <TableCell>{(q as any).triageLevel ?? (q as any).triage?.level ?? q.triageLevel ?? "—"}</TableCell>
                        <TableCell>{fmtDT(q.createdAt)}</TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(q.id);
                                  setViewOpen(true);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(q);
                                }}
                                disabled={busy}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete">
                              <IconButton
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(q.id);
                                  setDeleteOpen(true);
                                }}
                                disabled={busy}
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

          {updateQueue.isError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {(updateQueue.error as any)?.message ?? "Update failed."}
            </Alert>
          )}
          {deleteQueue.isError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {(deleteQueue.error as any)?.message ?? "Delete failed."}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Queue Details</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                <Typography fontWeight={900}>{selected.patientName ?? "—"}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {priorityChip(selected.priority)}
                  {statusChip(selected.status)}
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <b>Queue ID:</b> {selected.id ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Patient ID:</b> {selected.patientId ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Triage:</b> {(selected as any).triageLevel ?? (selected as any).triage?.level ?? selected.triageLevel ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Created:</b> {fmtDT(selected.createdAt)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <b>Status:</b> {(selected.status ?? "—").toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    <b>Priority:</b> {(selected.priority ?? "NORMAL").toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    <b>Admitted:</b> {selected.admitted ? "Yes" : "No"}
                  </Typography>
                  {(selected as any)?.updatedAt && (
                    <Typography variant="body2">
                      <b>Updated:</b> {fmtDT((selected as any).updatedAt)}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {String(selected.status ?? "").toUpperCase() === "ADMITTED" && selected.admitted !== true && (
                <Alert severity="info">This queue item is marked ADMITTED but still awaiting nurse confirmation.</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Queue</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={900}>{selected.patientName ?? "—"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Queue ID: {selected.id ?? "—"} • Patient ID: {selected.patientId ?? "—"}
                  </Typography>
                </CardContent>
              </Card>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Priority"
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value as QueuePriority)}
                    fullWidth
                    disabled={busy}
                  >
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Status"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as QueueStatus)}
                    fullWidth
                    disabled={busy}
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Admitted flag"
                    value={draftAdmitted ? "YES" : "NO"}
                    onChange={(e) => setDraftAdmitted(e.target.value === "YES")}
                    fullWidth
                    disabled={busy}
                    helperText="admitted=true means confirmed admission (be careful)"
                  >
                    <MenuItem value="NO">No</MenuItem>
                    <MenuItem value="YES">Yes</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <Alert severity="warning">Admin edit updates only the queue record. It does not create admissions or other side-effects.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={saveEdit} variant="contained" disabled={busy || !selected}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Queue Record</DialogTitle>
        <DialogContent dividers>
          {!selected ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1}>
              <Typography>
                Delete queue record <b>#{selected.id}</b> for <b>{selected.patientName ?? "—"}</b>?
              </Typography>
              <Alert severity="warning">This cannot be undone.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" disabled={busy || !selected}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
