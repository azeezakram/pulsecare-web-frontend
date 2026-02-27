/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import type { TriageReq, TriageRes } from "../../features/triage/types";
import { useAllTriage, useDeleteTriage, useUpdateTriage } from "../../features/triage/triage-service";

import type { PatientRes } from "../../features/patient/types";
import { useAllPatients } from "../../features/patient/patient-service";

import type { LoginAuthReq } from "../../features/auth/types";
import { useVerifyByPassword } from "../../features/auth/auth-service";

import ConfirmPasswordDialog from "../../components/dialog/ConfirmPasswordDialog";

type SortKey = "createdAt" | "triageLevel";
type SeverityFilter = "ALL" | "CRITICAL" | "NON_CRITICAL";

const arrivalMap: Record<number, string> = {
  1: "Walking",
  2: "Public Ambulance",
  3: "Private Vehicle",
  4: "Private Ambulance",
  5: "Other 1",
  6: "Other 2",
  7: "Other 3",
};

const mentalMap: Record<number, string> = {
  1: "Alert",
  2: "Verbal Response",
  3: "Pain Response",
  4: "Unresponsive",
};

function isNonCritical(sev?: string, level?: number) {
  const s = (sev ?? "").toLowerCase();
  return level === 1 || s.includes("non-critical") || s.includes("non critical") || s.includes("green");
}

function isCritical(sev?: string, level?: number) {
  const s = (sev ?? "").toLowerCase();
  return (
    level === 0 ||
    (s.includes("critical") && !s.includes("non-critical") && !s.includes("non critical")) ||
    s.includes("red")
  );
}

function severityChip(sev?: string, level?: number) {
  if (isNonCritical(sev, level)) return <Chip color="success" label={sev ?? "NON-CRITICAL"} size="small" />;
  if (isCritical(sev, level)) return <Chip color="error" label={sev ?? "CRITICAL"} size="small" />;
  return <Chip label={sev ?? "—"} size="small" />;
}

function toISODate(d: Dayjs | null) {
  return d && d.isValid() ? d.format("YYYY-MM-DD") : "";
}

function withinRange(ts: string | Date, from?: Dayjs | null, to?: Dayjs | null) {
  const t = dayjs(ts);
  if (!t.isValid()) return true;
  if (from && from.isValid() && t.isBefore(from.startOf("day"))) return false;
  if (to && to.isValid() && t.isAfter(to.endOf("day"))) return false;
  return true;
}

function csvEscape(v: any) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

type EditFormState = {
  sex: string;
  arrivalMode: string;
  injury: string;
  mental: string;
  pain: string;
  age: string;
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  bt: string;
};

function toNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function validateEdit(form: EditFormState) {
  const e: Partial<Record<keyof EditFormState, string>> = {};

  const reqNum = (k: keyof EditFormState, label: string) => {
    if (!form[k].trim()) e[k] = `${label} is required`;
    else if (Number.isNaN(toNum(form[k]))) e[k] = `${label} must be a number`;
  };

  reqNum("sex", "Sex");
  reqNum("arrivalMode", "Arrival mode");
  reqNum("injury", "Injury");
  reqNum("mental", "Mental status");
  reqNum("pain", "Pain");
  reqNum("age", "Age");
  reqNum("sbp", "SBP");
  reqNum("dbp", "DBP");
  reqNum("hr", "HR");
  reqNum("rr", "RR");
  reqNum("bt", "BT");

  const age = toNum(form.age);
  const sbp = toNum(form.sbp);
  const dbp = toNum(form.dbp);
  const hr = toNum(form.hr);
  const rr = toNum(form.rr);
  const bt = toNum(form.bt);

  if (Number.isFinite(age) && (age < 0 || age > 150)) e.age = "Age must be 0 - 150";
  if (Number.isFinite(sbp) && (sbp < 50 || sbp > 250)) e.sbp = "SBP must be 50 - 250";
  if (Number.isFinite(dbp) && (dbp < 30 || dbp > 150)) e.dbp = "DBP must be 30 - 150";
  if (Number.isFinite(hr) && (hr < 30 || hr > 250)) e.hr = "HR must be 30 - 250";
  if (Number.isFinite(rr) && (rr < 5 || rr > 60)) e.rr = "RR must be 5 - 60";
  if (Number.isFinite(bt) && (bt < 35 || bt > 42)) e.bt = "Body temperature must be 35.0 - 42.0";

  const sex = toNum(form.sex);
  if (Number.isFinite(sex) && !(sex === 0 || sex === 1)) e.sex = "Sex must be Female or Male";

  const arrivalMode = toNum(form.arrivalMode);
  if (Number.isFinite(arrivalMode) && !(arrivalMode >= 1 && arrivalMode <= 7)) e.arrivalMode = "Arrival mode must be between 1 and 7";

  const injury = toNum(form.injury);
  if (Number.isFinite(injury) && !(injury === 1 || injury === 2)) e.injury = "Injury must be Yes or No";

  const mental = toNum(form.mental);
  if (Number.isFinite(mental) && !(mental >= 1 && mental <= 4)) e.mental = "Mental status must be between 1 and 4";

  const pain = toNum(form.pain);
  if (Number.isFinite(pain) && !(pain === 0 || pain === 1)) e.pain = "Pain must be Yes or No";

  return e;
}

export default function AdminTriagePage() {
  const triageQuery = useAllTriage();
  const patientsQuery = useAllPatients();

  const updateTriage = useUpdateTriage();
  const deleteTriage = useDeleteTriage();
  const verifyPwd = useVerifyByPassword();

  const [historySearch, setHistorySearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().subtract(14, "day"));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());

  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState<TriageRes | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<TriageRes | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    sex: "0",
    arrivalMode: "1",
    injury: "1",
    mental: "1",
    pain: "0",
    age: "",
    sbp: "",
    dbp: "",
    hr: "",
    rr: "",
    bt: "",
  });
  const [editTouched, setEditTouched] = useState<Partial<Record<keyof EditFormState, boolean>>>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm Password");
  const [confirmDesc, setConfirmDesc] = useState("Please enter your password to continue.");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<
    null | { type: "DELETE"; item: TriageRes } | { type: "UPDATE"; item: TriageRes; req: TriageReq }
  >(null);

  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);
  const history = useMemo(() => triageQuery.data ?? [], [triageQuery.data]);

  const patientById = useMemo(() => {
    const m = new Map<number, PatientRes>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();

    const matchSeverity = (t: TriageRes) => {
      if (severityFilter === "ALL") return true;
      const c = isCritical(t.severity, t.triageLevel);
      const nc = isNonCritical(t.severity, t.triageLevel);
      return severityFilter === "CRITICAL" ? c : nc;
    };

    const matchQuery = (t: TriageRes) => {
      if (!q) return true;
      const p = patientById.get(t.patientId);
      const name = (p?.fullName ?? "").toLowerCase();
      const nic = (p?.nic ?? "").toLowerCase();
      const pid = String(t.patientId ?? "").toLowerCase();
      return name.includes(q) || nic.includes(q) || pid.includes(q);
    };

    return [...history]
      .filter((t) => withinRange((t.createdAt ?? t.updatedAt) as any, fromDate, toDate))
      .filter((t) => matchSeverity(t) && matchQuery(t))
      .sort((a, b) => {
        const av = sortKey === "createdAt" ? new Date(a.createdAt as any).getTime() : Number(a.triageLevel ?? 9999);
        const bv = sortKey === "createdAt" ? new Date(b.createdAt as any).getTime() : Number(b.triageLevel ?? 9999);
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [history, historySearch, severityFilter, sortKey, sortDir, patientById, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = filteredHistory.length;
    let critical = 0;
    let nonCritical = 0;

    const avgWait = (() => {
      const ms: number[] = [];
      for (const t of filteredHistory) {
        const a = dayjs(t.createdAt as any);
        const b = dayjs((t.updatedAt ?? t.createdAt) as any);
        if (a.isValid() && b.isValid()) ms.push(Math.max(0, b.diff(a, "minute")));
      }
      if (!ms.length) return 0;
      return Math.round(ms.reduce((x, y) => x + y, 0) / ms.length);
    })();

    for (const t of filteredHistory) {
      if (isNonCritical(t.severity, t.triageLevel)) nonCritical++;
      else if (isCritical(t.severity, t.triageLevel)) critical++;
    }

    return { total, critical, nonCritical, avgWait };
  }, [filteredHistory]);

  const seriesByDay = useMemo(() => {
    const map = new Map<string, { date: string; total: number; critical: number; nonCritical: number }>();

    for (const t of filteredHistory) {
      const d = dayjs((t.createdAt ?? t.updatedAt) as any);
      if (!d.isValid()) continue;

      const key = d.format("YYYY-MM-DD");
      const cur = map.get(key) ?? { date: key, total: 0, critical: 0, nonCritical: 0 };

      cur.total += 1;
      if (isNonCritical(t.severity, t.triageLevel)) cur.nonCritical += 1;
      else if (isCritical(t.severity, t.triageLevel)) cur.critical += 1;

      map.set(key, cur);
    }

    return [...map.values()].sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [filteredHistory]);

  const pieData = useMemo(
    () => [
      { name: "Critical", value: stats.critical, color: "#d32f2f" },
      { name: "Non-Critical", value: stats.nonCritical, color: "#2e7d32" },
      { name: "Other", value: Math.max(0, stats.total - stats.critical - stats.nonCritical), color: "#9e9e9e" },
    ],
    [stats]
  );

  const triageLevelDistribution = useMemo(() => {
    const criticalCount = filteredHistory.filter((t) => isCritical(t.severity, t.triageLevel)).length;
    const nonCriticalCount = filteredHistory.filter((t) => isNonCritical(t.severity, t.triageLevel)).length;

    return [
      { level: "Critical", count: criticalCount, color: "#d32f2f" },
      { level: "Non-Critical", count: nonCriticalCount, color: "#2e7d32" },
    ];
  }, [filteredHistory]);

  const resetFilters = () => {
    setHistorySearch("");
    setSeverityFilter("ALL");
    setSortKey("createdAt");
    setSortDir("desc");
    setFromDate(dayjs().subtract(14, "day"));
    setToDate(dayjs());
  };

  const exportCSV = () => {
    const header = [
      "PatientName",
      "NIC",
      "Sex",
      "Age",
      "ArrivalMode",
      "Injury",
      "MentalStatus",
      "Pain",
      "Severity",
      "TriageLevel",
      "SBP",
      "DBP",
      "HR",
      "RR",
      "BT",
      "ShockIndex",
      "PulsePressure",
      "PPRatio",
      "RRHRRatio",
      "HRxBTInteraction",
      "IsFever",
      "IsTachycardia",
      "IsLowSBP",
      "IsLowDBP",
      "IsTachypnea",
      "CreatedAt",
      "UpdatedAt",
    ];

    const rows = filteredHistory.map((t) => {
      const p = patientById.get(t.patientId);
      const values = [
        p?.fullName ?? "",
        p?.nic ?? "",
        t.sex === 1 ? "Male" : "Female",
        t.age ?? "",
        arrivalMap[t.arrivalMode] ?? "",
        t.injury === 2 ? "Yes" : "No",
        mentalMap[t.mental] ?? "",
        t.pain === 1 ? "Yes" : "No",
        t.severity ?? "",
        t.triageLevel ?? "",
        t.sbp ?? "",
        t.dbp ?? "",
        t.hr ?? "",
        t.rr ?? "",
        t.bt ?? "",
        t.shockIndex ?? "",
        t.pulsePressure ?? "",
        t.ppRatio ?? "",
        t.rrHrRatio ?? "",
        t.hrBtInteraction ?? "",
        t.isFever ? "Yes" : "No",
        t.isTachy ? "Yes" : "No",
        t.isLowSbp ? "Yes" : "No",
        t.isLowDbp ? "Yes" : "No",
        t.isTachypnea ? "Yes" : "No",
        t.createdAt ?? "",
        t.updatedAt ?? "",
      ];
      return values.map(csvEscape).join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `triage-history_${toISODate(fromDate)}_to_${toISODate(toDate)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const openEdit = (item: TriageRes) => {
    setEditItem(item);
    setEditForm({
      sex: String(item.sex ?? 0),
      arrivalMode: String(item.arrivalMode ?? 1),
      injury: String(item.injury ?? 1),
      mental: String(item.mental ?? 1),
      pain: String(item.pain ?? 0),
      age: String(item.age ?? ""),
      sbp: String(item.sbp ?? ""),
      dbp: String(item.dbp ?? ""),
      hr: String(item.hr ?? ""),
      rr: String(item.rr ?? ""),
      bt: String(item.bt ?? ""),
    });
    setEditTouched({});
    setEditErrors({});
    setEditOpen(true);
  };

  const recomputeEditErrors = (next: EditFormState, nextTouched = editTouched) => {
    const all = validateEdit(next);
    const filtered: Partial<Record<keyof EditFormState, string>> = {};
    (Object.keys(all) as (keyof EditFormState)[]).forEach((k) => {
      if (nextTouched[k]) filtered[k] = all[k];
    });
    setEditErrors(filtered);
    return all;
  };

  const setEditField = (k: keyof EditFormState, v: string) => {
    const next = { ...editForm, [k]: v };
    setEditForm(next);
    const nt = { ...editTouched, [k]: true };
    setEditTouched(nt);
    recomputeEditErrors(next, nt);
  };

  const blurEdit = (k: keyof EditFormState) => {
    const nt = { ...editTouched, [k]: true };
    setEditTouched(nt);
    recomputeEditErrors(editForm, nt);
  };

  const requestUpdate = () => {
    if (!editItem) return;

    const allTouched: Partial<Record<keyof EditFormState, boolean>> = {
      sex: true,
      arrivalMode: true,
      injury: true,
      mental: true,
      pain: true,
      age: true,
      sbp: true,
      dbp: true,
      hr: true,
      rr: true,
      bt: true,
    };
    setEditTouched(allTouched);

    const allErr = recomputeEditErrors(editForm, allTouched);
    if (Object.values(allErr).some(Boolean)) return;

    const req: TriageReq = {
      patientId: editItem.patientId, // keep same patient
      sex: toNum(editForm.sex),
      arrivalMode: toNum(editForm.arrivalMode),
      injury: toNum(editForm.injury),
      mental: toNum(editForm.mental),
      pain: toNum(editForm.pain),
      age: toNum(editForm.age),
      sbp: toNum(editForm.sbp),
      dbp: toNum(editForm.dbp),
      hr: toNum(editForm.hr),
      rr: toNum(editForm.rr),
      bt: toNum(editForm.bt),
    };

    setEditOpen(false);

    setConfirmTitle("Confirm Password to Update");
    setConfirmDesc("Enter your password to update this triage record.");
    setConfirmError(null);
    setPendingAction({ type: "UPDATE", item: editItem, req });
    setConfirmOpen(true);
  };

  const requestDelete = (item: TriageRes) => {
    setConfirmTitle("Confirm Password to Delete");
    setConfirmDesc("Enter your password to permanently delete this triage record.");
    setConfirmError(null);
    setPendingAction({ type: "DELETE", item });
    setConfirmOpen(true);
  };

  const handleConfirmPassword = async (password: string) => {
    if (!pendingAction) return;

    setConfirmError(null);

    try {
      // 1) verify password via your hook
      const payload: LoginAuthReq = { password } as any;
      await verifyPwd.mutateAsync(payload);

      // 2) execute action via your triage hooks
      if (pendingAction.type === "DELETE") {
        await deleteTriage.mutateAsync(pendingAction.item.id);
      } else {
        await updateTriage.mutateAsync({ id: pendingAction.item.id, data: pendingAction.req });
      }

      setConfirmOpen(false);
      setPendingAction(null);

      // refresh list (your create/predict invalidates ["triage"], update/delete invalidates ["triages"] currently)
      await triageQuery.refetch();

      if (viewItem) {
        const updated = (triageQuery.data ?? []).find((x) => x.id === viewItem.id) ?? null;
        setViewItem(updated);
      }
    } catch (e: any) {
      // Prefer backend message if your ErrorResponseBody has .message
      const msg = e?.response?.data?.message ?? e?.message ?? "Action failed.";
      setConfirmError(msg);
    }
  };

  const busy =
    triageQuery.isLoading ||
    patientsQuery.isLoading ||
    verifyPwd.isPending ||
    updateTriage.isPending ||
    deleteTriage.isPending;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.6}>
          <Typography variant="h5" fontWeight={900}>
            Triage AI History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dashboard • Charts • Triage history
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Reset filters">
            <IconButton onClick={resetFilters} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Chip label="Admin View" variant="outlined" />
        </Stack>
      </Stack>

      {(triageQuery.isError || patientsQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(triageQuery.error as any)?.message ?? (patientsQuery.error as any)?.message ?? "Failed to load data."}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total (Filtered)
              </Typography>
              <Typography variant="h5" fontWeight={900}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {toISODate(fromDate)} → {toISODate(toDate)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Critical
              </Typography>
              <Typography variant="h5" fontWeight={900} color="error.main">
                {stats.critical}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High priority cases
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Non-Critical
              </Typography>
              <Typography variant="h5" fontWeight={900} color="success.main">
                {stats.nonCritical}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stable / lower priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Avg. Update Delay
              </Typography>
              <Typography variant="h5" fontWeight={900}>
                {stats.avgWait} min
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created → Updated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="From"
                  value={fromDate}
                  onChange={(v) => setFromDate(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="To"
                  value={toDate}
                  onChange={(v) => setToDate(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Search (Name / NIC / Patient ID)"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  select
                  label="Severity"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                  fullWidth
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                  <MenuItem value="NON_CRITICAL">Non-Critical</MenuItem>
                </TextField>

                <Button variant="outlined" onClick={exportCSV} disabled={!filteredHistory.length || busy} size="small">
                  Export CSV
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Sort By" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} fullWidth>
                <MenuItem value="createdAt">Created</MenuItem>
                <MenuItem value="triageLevel">Triage Level</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Order" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} fullWidth>
                <MenuItem value="desc">Desc</MenuItem>
                <MenuItem value="asc">Asc</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography fontWeight={900}>Triage Volume Over Time</Typography>
                <Typography variant="body2" color="text.secondary">
                  Daily counts (filtered)
                </Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              {busy ? (
                <Alert severity="info">Loading chart…</Alert>
              ) : seriesByDay.length === 0 ? (
                <Alert severity="warning">No data for selected filters.</Alert>
              ) : (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format("MMM D")} />
                      <YAxis allowDecimals={false} />
                      <RTooltip
                        labelFormatter={(v) => `Date: ${dayjs(String(v)).format("YYYY-MM-DD")}`}
                        formatter={(value: any, name: any) => [value, String(name)]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" dot={false} stroke="#1565c0" />
                      <Line type="monotone" dataKey="critical" dot={false} stroke="#d32f2f" />
                      <Line type="monotone" dataKey="nonCritical" dot={false} stroke="#2e7d32" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography fontWeight={900}>Severity Split</Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical vs Non-Critical
                </Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              {busy ? (
                <Alert severity="info">Loading chart…</Alert>
              ) : stats.total === 0 ? (
                <Alert severity="warning">No data for selected filters.</Alert>
              ) : (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography fontWeight={900}>Triage Level Distribution</Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical vs Non-Critical (filtered)
                </Typography>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              {busy ? (
                <Alert severity="info">Loading chart…</Alert>
              ) : stats.total === 0 ? (
                <Alert severity="warning">No data for selected filters.</Alert>
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={triageLevelDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="count">
                        {triageLevelDistribution.map((d) => (
                          <Cell key={d.level} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack spacing={0.3}>
              <Typography fontWeight={900}>Triage History</Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredHistory.length} record(s)
              </Typography>
            </Stack>
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {triageQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading…</TableCell>
                  </TableRow>
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No records found.</TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.slice(0, 200).map((t) => {
                    const p = patientById.get(t.patientId);
                    return (
                      <TableRow key={t.id} hover>
                        <TableCell>{`${p?.fullName ?? "—"} • NIC ${p?.nic ?? "—"} • ID ${t.patientId}`}</TableCell>
                        <TableCell>{severityChip(t.severity, t.triageLevel)}</TableCell>
                        <TableCell>{t.triageLevel ?? "—"}</TableCell>
                        <TableCell>{new Date(t.createdAt as any).toLocaleString()}</TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View details">
                              <IconButton
                                onClick={() => {
                                  setViewItem(t);
                                  setOpenView(true);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Update">
                              <IconButton onClick={() => openEdit(t)} disabled={busy}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete">
                              <IconButton color="error" onClick={() => requestDelete(t)} disabled={busy}>
                                <DeleteIcon />
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

      {/* VIEW */}
      <Dialog open={openView} onClose={() => setOpenView(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Typography fontWeight={900}>Triage Record</Typography>
        </DialogTitle>

        <DialogContent dividers>
          {!viewItem ? (
            <Alert severity="warning">No record selected.</Alert>
          ) : (
            <Stack spacing={2}>
              {(() => {
                const patient = patientById.get(viewItem.patientId);

                return (
                  <>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={900} sx={{ mb: 1 }}>
                          Patient Information
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Typography>
                          <b>Name:</b> {patient?.fullName ?? "—"}
                        </Typography>
                        <Typography>
                          <b>NIC:</b> {patient?.nic ?? "—"}
                        </Typography>
                        <Typography>
                          <b>Sex:</b> {viewItem.sex === 1 ? "Male" : "Female"}
                        </Typography>
                        <Typography>
                          <b>Age:</b> {viewItem.age}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {severityChip(viewItem.severity, viewItem.triageLevel)}
                      <Chip label={`Triage Level: ${viewItem.triageLevel ?? "—"}`} />
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography fontWeight={900} sx={{ mb: 1 }}>
                              Clinical Inputs
                            </Typography>
                            <Divider sx={{ mb: 1 }} />

                            <Typography>
                              <b>Arrival Mode:</b> {arrivalMap[viewItem.arrivalMode] ?? "—"}
                            </Typography>
                            <Typography>
                              <b>Injury:</b> {viewItem.injury === 2 ? "Yes" : "No"}
                            </Typography>
                            <Typography>
                              <b>Mental Status:</b> {mentalMap[viewItem.mental] ?? "—"}
                            </Typography>
                            <Typography>
                              <b>Pain:</b> {viewItem.pain === 1 ? "Yes" : "No"}
                            </Typography>

                            <Divider sx={{ my: 1 }} />

                            <Typography>
                              <b>SBP:</b> {viewItem.sbp}
                            </Typography>
                            <Typography>
                              <b>DBP:</b> {viewItem.dbp}
                            </Typography>
                            <Typography>
                              <b>Heart Rate:</b> {viewItem.hr}
                            </Typography>
                            <Typography>
                              <b>Respiratory Rate:</b> {viewItem.rr}
                            </Typography>
                            <Typography>
                              <b>Body Temperature:</b> {viewItem.bt}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography fontWeight={900} sx={{ mb: 1 }}>
                              Computed Features
                            </Typography>
                            <Divider sx={{ mb: 1 }} />

                            <Typography>
                              <b>Shock Index:</b> {viewItem.shockIndex ?? "—"}
                            </Typography>
                            <Typography>
                              <b>Pulse Pressure:</b> {viewItem.pulsePressure ?? "—"}
                            </Typography>
                            <Typography>
                              <b>PP Ratio:</b> {viewItem.ppRatio ?? "—"}
                            </Typography>
                            <Typography>
                              <b>HR × BT Interaction:</b> {viewItem.hrBtInteraction ?? "—"}
                            </Typography>
                            <Typography>
                              <b>RR / HR Ratio:</b> {viewItem.rrHrRatio ?? "—"}
                            </Typography>

                            <Divider sx={{ my: 1 }} />

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip size="small" label={`Fever: ${viewItem.isFever ? "Yes" : "No"}`} />
                              <Chip size="small" label={`Tachycardia: ${viewItem.isTachy ? "Yes" : "No"}`} />
                              <Chip size="small" label={`Low SBP: ${viewItem.isLowSbp ? "Yes" : "No"}`} />
                              <Chip size="small" label={`Low DBP: ${viewItem.isLowDbp ? "Yes" : "No"}`} />
                              <Chip size="small" label={`Tachypnea: ${viewItem.isTachypnea ? "Yes" : "No"}`} />
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={900} sx={{ mb: 1 }}>
                          Timestamps
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Typography>
                          <b>Created At:</b> {new Date(viewItem.createdAt).toLocaleString()}
                        </Typography>
                        <Typography>
                          <b>Updated At:</b> {new Date(viewItem.updatedAt).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenView(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Typography fontWeight={900}>Update Triage Record</Typography>
        </DialogTitle>

        <DialogContent dividers>
          {!editItem ? (
            <Alert severity="warning">No record selected.</Alert>
          ) : (
            <Stack spacing={2}>
              {(() => {
                const p = patientById.get(editItem.patientId);
                return (
                  <Alert severity="info">
                    Patient: <b>{p?.fullName ?? "—"}</b> • NIC <b>{p?.nic ?? "—"}</b>
                  </Alert>
                );
              })()}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    label="Sex"
                    value={editForm.sex}
                    onChange={(e) => setEditField("sex", e.target.value)}
                    onBlur={() => blurEdit("sex")}
                    error={!!editErrors.sex}
                    helperText={editErrors.sex}
                    fullWidth
                  >
                    <MenuItem value="0">Female</MenuItem>
                    <MenuItem value="1">Male</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Age"
                    value={editForm.age}
                    onChange={(e) => setEditField("age", e.target.value)}
                    onBlur={() => blurEdit("age")}
                    error={!!editErrors.age}
                    helperText={editErrors.age}
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Arrival Mode"
                    value={editForm.arrivalMode}
                    onChange={(e) => setEditField("arrivalMode", e.target.value)}
                    onBlur={() => blurEdit("arrivalMode")}
                    error={!!editErrors.arrivalMode}
                    helperText={editErrors.arrivalMode}
                    fullWidth
                  >
                    {Object.entries(arrivalMap).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Injury"
                    value={editForm.injury}
                    onChange={(e) => setEditField("injury", e.target.value)}
                    onBlur={() => blurEdit("injury")}
                    error={!!editErrors.injury}
                    helperText={editErrors.injury}
                    fullWidth
                  >
                    <MenuItem value="2">Yes</MenuItem>
                    <MenuItem value="1">No</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Pain"
                    value={editForm.pain}
                    onChange={(e) => setEditField("pain", e.target.value)}
                    onBlur={() => blurEdit("pain")}
                    error={!!editErrors.pain}
                    helperText={editErrors.pain}
                    fullWidth
                  >
                    <MenuItem value="0">No</MenuItem>
                    <MenuItem value="1">Yes</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Mental Status"
                    value={editForm.mental}
                    onChange={(e) => setEditField("mental", e.target.value)}
                    onBlur={() => blurEdit("mental")}
                    error={!!editErrors.mental}
                    helperText={editErrors.mental}
                    fullWidth
                  >
                    {Object.entries(mentalMap).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="SBP"
                    value={editForm.sbp}
                    onChange={(e) => setEditField("sbp", e.target.value)}
                    onBlur={() => blurEdit("sbp")}
                    error={!!editErrors.sbp}
                    helperText={editErrors.sbp}
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="DBP"
                    value={editForm.dbp}
                    onChange={(e) => setEditField("dbp", e.target.value)}
                    onBlur={() => blurEdit("dbp")}
                    error={!!editErrors.dbp}
                    helperText={editErrors.dbp}
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="HR"
                    value={editForm.hr}
                    onChange={(e) => setEditField("hr", e.target.value)}
                    onBlur={() => blurEdit("hr")}
                    error={!!editErrors.hr}
                    helperText={editErrors.hr}
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="RR"
                    value={editForm.rr}
                    onChange={(e) => setEditField("rr", e.target.value)}
                    onBlur={() => blurEdit("rr")}
                    error={!!editErrors.rr}
                    helperText={editErrors.rr}
                    fullWidth
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="BT"
                    value={editForm.bt}
                    onChange={(e) => setEditField("bt", e.target.value)}
                    onBlur={() => blurEdit("bt")}
                    error={!!editErrors.bt}
                    helperText={editErrors.bt}
                    fullWidth
                    inputProps={{ inputMode: "decimal" }}
                  />
                </Grid>
              </Grid>

              {updateTriage.isError && (
                <Alert severity="error">{(updateTriage.error as any)?.message ?? "Update failed."}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditOpen(false)} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={requestUpdate} variant="contained" disabled={busy || !editItem}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM PASSWORD */}
      <ConfirmPasswordDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        busy={verifyPwd.isPending || updateTriage.isPending || deleteTriage.isPending}
        error={confirmError}
        onClose={() => {
          if (verifyPwd.isPending || updateTriage.isPending || deleteTriage.isPending) return;
          setConfirmOpen(false);
          setPendingAction(null);
          setConfirmError(null);
        }}
        onConfirm={handleConfirmPassword}
      />
    </Box>
  );
}
