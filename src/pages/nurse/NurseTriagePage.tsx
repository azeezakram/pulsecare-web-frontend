/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

import dayjs from "dayjs";

import { useAllTriage, usePredictTriage } from "../../features/triage/triage-service";
import type { TriageReq, TriageRes } from "../../features/triage/types";

import PatientSelectWithCreate from "../../components/dialog/PatientSelectWithCreate";
import { useAllActivePatients } from "../../features/patient/patient-service";
import type { PatientRes } from "../../features/patient/types";

import { useAllPatientQueues, useCreatePatientQueue, useUpdatePatientQueue } from "../../features/patient-queue/patientQueue-service";
import type { PatientQueueReq, PatientQueueRes, QueuePriority } from "../../features/patient-queue/types";

import { useCheckActiveAdmission, useCreatePatientAdmission } from "../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionReq } from "../../features/patient-admission/types";

import { useBedsByWardId } from "../../features/bed/bed-service";
import { useAllDepartments } from "../../features/department/department-service";
import { useWardsByDepartmentId } from "../../features/ward/ward-service";

type FieldErrors = Partial<Record<keyof TriageReq, string>>;
type SortKey = "createdAt" | "triageLevel";

type TriageFormState = Omit<TriageReq, "age" | "sbp" | "dbp" | "hr" | "rr" | "bt"> & {
  age: string;
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  bt: string;
};

const DEFAULT_FORM: TriageFormState = {
  patientId: 0,
  sex: 0,
  arrivalMode: 1,
  injury: 2,
  mental: 1,
  pain: 0,
  age: "25",
  sbp: "120",
  dbp: "80",
  hr: "80",
  rr: "16",
  bt: "36.8",
};

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function calcAge(dobISO?: string) {
  if (!dobISO) return "";
  const d = dayjs(dobISO);
  if (!d.isValid()) return "";
  const years = dayjs().diff(d, "year");
  return String(Math.max(0, years));
}

const genderToSex = (g?: string) => {
  const s = (g ?? "").toUpperCase();
  if (s === "MALE") return 1;
  if (s === "FEMALE") return 0;
  return 0;
};

function severityChip(sev?: string, level?: number) {
  const s = (sev ?? "").toLowerCase();

  const isNonCritical =
    level === 1 ||
    s.includes("non-critical") ||
    s.includes("non critical") ||
    s.includes("green");

  const isCritical =
    level === 0 ||
    (s.includes("critical") && !s.includes("non-critical") && !s.includes("non critical")) ||
    s.includes("red");

  if (isNonCritical) return <Chip color="success" label={sev ?? "NON-CRITICAL"} size="small" />;
  if (isCritical) return <Chip color="error" label={sev ?? "CRITICAL"} size="small" />;
  return <Chip label={sev ?? "—"} size="small" />;
}

function validateReq(req: TriageReq): FieldErrors {
  const e: FieldErrors = {};

  if (!req.patientId) e.patientId = "Patient is required";

  if (!(req.sex === 0 || req.sex === 1)) e.sex = "Sex must be Female or Male";
  if (!(req.arrivalMode >= 1 && req.arrivalMode <= 7)) e.arrivalMode = "Arrival mode must be between 1 and 7";
  if (!(req.injury === 1 || req.injury === 2)) e.injury = "Injury must be Yes or No";
  if (!(req.mental >= 1 && req.mental <= 4)) e.mental = "Mental status must be between 1 and 4";
  if (!(req.pain === 0 || req.pain === 1)) e.pain = "Pain must be Yes or No";

  if (!(req.age >= 0 && req.age <= 150)) e.age = "Age must be 0 - 150";

  if (!(req.sbp >= 50 && req.sbp <= 250)) e.sbp = "SBP must be 50 - 250";
  if (!(req.dbp >= 30 && req.dbp <= 150)) e.dbp = "DBP must be 30 - 150";
  if (!(req.hr >= 30 && req.hr <= 250)) e.hr = "HR must be 30 - 250";
  if (!(req.rr >= 5 && req.rr <= 60)) e.rr = "RR must be 5 - 60";

  if (!(req.bt >= 35.0 && req.bt <= 42.0)) e.bt = "Body temperature must be 35.0 - 42.0";

  return e;
}

function inferPriorityFromPrediction(pred?: TriageRes | null): QueuePriority {
  if (!pred) return "NORMAL";
  const sev = (pred.severity ?? "").toLowerCase();
  const isCritical =
    pred.triageLevel === 0 ||
    (sev.includes("critical") && !sev.includes("non-critical") && !sev.includes("non critical")) ||
    sev.includes("red");
  const isNonCritical =
    pred.triageLevel === 1 || sev.includes("non") || sev.includes("green");

  if (isCritical) return "CRITICAL";
  if (isNonCritical) return "NON_CRITICAL";
  return "NORMAL";
}

function isBlockingQueue(q: PatientQueueRes) {
  const s = (q.status ?? "").toUpperCase();
  if (s === "WAITING") return true;
  if (s === "ADMITTED") return q.admitted === false;
  return false;
}

export default function NurseTriageAiPage() {
  const triageQuery = useAllTriage();
  const predictMutation = usePredictTriage();

  const patientsQuery = useAllActivePatients();

  const queuesQuery = useAllPatientQueues();
  const createQueue = useCreatePatientQueue();
  const updateQueue = useUpdatePatientQueue();
  const createAdmission = useCreatePatientAdmission();
  const hasActiveAdmissionQuery = useCheckActiveAdmission()

  const deptsQuery = useAllDepartments();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitDeptId, setAdmitDeptId] = useState<number | "">("");
  const [admitWardId, setAdmitWardId] = useState<number | "">("");
  const [admitBedId, setAdmitBedId] = useState<number | "">("");
  const [admitAttempted, setAdmitAttempted] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  const wardsQuery = useWardsByDepartmentId(typeof admitDeptId === "number" ? admitDeptId : undefined);
  const bedsQuery = useBedsByWardId(typeof admitWardId === "number" ? admitWardId : undefined);

  const wards = useMemo(() => wardsQuery.data ?? [], [wardsQuery.data]);
  const beds = useMemo(() => bedsQuery.data ?? [], [bedsQuery.data]);
  const depts = useMemo(() => deptsQuery.data ?? [], [deptsQuery.data]);

  const deptLabel = (d: any) => d?.name ?? d?.deptName ?? d?.departmentName ?? `Department #${d?.id ?? "—"}`;
  const wardLabel = (w: any) => w?.name ?? w?.wardName ?? `Ward #${w?.id ?? "—"}`;
  const bedLabel = (b: any) => b?.bedNo ?? b?.name ?? `Bed #${b?.id ?? "—"}`;

  const [form, setForm] = useState<TriageFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TriageReq, boolean>>>({});
  const [predicted, setPredicted] = useState<TriageRes | null>(null);
  const [resultBoxError, setResultBoxError] = useState<string | null>(null);

  const [patientSelected, setPatientSelected] = useState<PatientRes | null>(null);

  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState<TriageRes | null>(null);

  const [historySearch, setHistorySearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CRITICAL" | "NON_CRITICAL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorWidth, setAnchorWidth] = useState<number>(0);

  const [actionError, setActionError] = useState<string | null>(null);
  const [currentQueueId, setCurrentQueueId] = useState<number | null>(null);

  const [isFinalized, setIsFinalized] = useState(true)

  const busy =
    triageQuery.isLoading ||
    predictMutation.isPending ||
    patientsQuery.isLoading ||
    queuesQuery.isLoading ||
    createQueue.isPending ||
    updateQueue.isPending ||
    createAdmission.isPending ||
    deptsQuery.isLoading ||
    wardsQuery.isLoading ||
    bedsQuery.isLoading;

  useEffect(() => {
    const el = searchBoxRef.current;
    if (!el) return;

    setAnchorEl(el);
    const updateWidth = () => setAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

  const patientById = useMemo(() => {
    const m = new Map<number, PatientRes>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  const history = useMemo(() => triageQuery.data ?? [], [triageQuery.data]);
  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);

  const blockingQueue = useMemo(() => {
    if (!patientSelected) return null;
    const list = queues.filter((q) => Number(q.patientId) === Number(patientSelected.id));
    return list.find(isBlockingQueue) ?? null;
  }, [queues, patientSelected]);

  const triageStats = useMemo(() => {
    let total = history.length;
    let critical = 0;
    let nonCritical = 0;

    for (const t of history) {
      const sev = (t.severity ?? "").toLowerCase();

      const isNonCritical =
        t.triageLevel === 1 ||
        sev.includes("non-critical") ||
        sev.includes("non critical") ||
        sev.includes("green");

      const isCritical =
        t.triageLevel === 0 ||
        (sev.includes("critical") && !sev.includes("non-critical") && !sev.includes("non critical")) ||
        sev.includes("red");

      if (isNonCritical) nonCritical++;
      else if (isCritical) critical++;
    }

    return { total, critical, nonCritical };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();

    const matchesSeverity = (t: TriageRes) => {
      if (severityFilter === "ALL") return true;
      const sev = (t.severity ?? "").toLowerCase();
      const isCritical = t.triageLevel === 0 || sev.includes("critical") || sev.includes("red");
      const isNonCritical = t.triageLevel === 1 || sev.includes("non") || sev.includes("green");
      return severityFilter === "CRITICAL" ? isCritical : isNonCritical;
    };

    const matchesQuery = (t: TriageRes) => {
      if (!q) return true;
      const p = patientById.get(t.patientId);
      const name = (p?.fullName ?? "").toLowerCase();
      const nic = (p?.nic ?? "").toLowerCase();
      return name.includes(q) || nic.includes(q);
    };

    return [...history]
      .filter((t) => matchesSeverity(t) && matchesQuery(t))
      .sort((a, b) => {
        const av =
          sortKey === "createdAt"
            ? new Date(a.createdAt).getTime()
            : Number(a.triageLevel ?? 9999);

        const bv =
          sortKey === "createdAt"
            ? new Date(b.createdAt).getTime()
            : Number(b.triageLevel ?? 9999);

        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [history, historySearch, severityFilter, sortKey, sortDir, patientById]);

  const buildReq = (f: TriageFormState): TriageReq => ({
    patientId: f.patientId,
    sex: f.sex,
    arrivalMode: f.arrivalMode,
    injury: f.injury,
    mental: f.mental,
    pain: f.pain,
    age: toNumber(f.age),
    sbp: toNumber(f.sbp),
    dbp: toNumber(f.dbp),
    hr: toNumber(f.hr),
    rr: toNumber(f.rr),
    bt: toNumber(f.bt),
  });

  const recomputeErrors = (nextForm: TriageFormState, nextTouched = touched) => {
    const req = buildReq(nextForm);

    const e: FieldErrors = {};
    if (!nextForm.patientId) e.patientId = "Patient is required";

    const mustNumber: Array<keyof Pick<TriageReq, "age" | "sbp" | "dbp" | "hr" | "rr" | "bt">> = [
      "age",
      "sbp",
      "dbp",
      "hr",
      "rr",
      "bt",
    ];
    for (const k of mustNumber) {
      const raw = (nextForm as any)[k] as string;
      const n = (req as any)[k] as number;
      if (!raw.trim()) e[k] = `${k.toUpperCase()} is required`;
      else if (Number.isNaN(n)) e[k] = `${k.toUpperCase()} must be a number`;
    }

    Object.assign(e, validateReq(req));

    const filtered: FieldErrors = {};
    (Object.keys(e) as (keyof TriageReq)[]).forEach((k) => {
      if (nextTouched[k]) filtered[k] = e[k];
    });

    setErrors(filtered);
    return { allErrors: e, req };
  };

  const onChange = (key: keyof TriageFormState, value: any) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);

    const nextTouched = { ...touched, [key as keyof TriageReq]: true };
    setTouched(nextTouched);

    recomputeErrors(nextForm, nextTouched);
  };

  const onBlur = (key: keyof TriageReq) => {
    const nextTouched = { ...touched, [key]: true };
    setTouched(nextTouched);
    recomputeErrors(form, nextTouched);
  };

  const resetAll = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setTouched({});
    setPredicted(null);
    setPatientSelected(null);

    setHistorySearch("");
    setSeverityFilter("ALL");
    setSortKey("createdAt");
    setSortDir("desc");

    setActionError(null);
    setCurrentQueueId(null);

    setAdmitOpen(false);
    setAdmitDeptId("");
    setAdmitWardId("");
    setAdmitBedId("");
    setAdmitAttempted(false);
    setAdmitError(null);
  };

  const handlePredict = async () => {
    setActionError(null);

    const allTouched: Partial<Record<keyof TriageReq, boolean>> = {
      patientId: true,
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
    setTouched(allTouched);

    const { allErrors, req } = recomputeErrors(form, allTouched);
    if (Object.values(allErrors).some(Boolean)) return;

    try {
      const res = await predictMutation.mutateAsync(req);
      setPredicted(res);
      setCurrentQueueId(null);
      setIsFinalized(false)
    } catch {
      //
    }
  };

  const handleAddToQueue = async () => {
    if (!patientSelected) {
      setActionError("Select a patient first.");
      return;
    }
    
    setActionError(null);

    try {
      const hasActive = await hasActiveAdmissionQuery(patientSelected.id);
      if (hasActive) {
        setResultBoxError("This patient already has an active admission.");
        return;
      }
    } catch (e: any) {
      setResultBoxError(e?.message ?? "Failed to check active admission.");
      return;
    }

    
    if (!predicted?.id) {
      setActionError("Predict triage first, then add to queue.");
      return;
    }

    if (blockingQueue) {
      const st = (blockingQueue.status ?? "WAITING").toUpperCase();
      const note =
        st === "ADMITTED"
          ? "This patient is already ADMITTED (waiting nurse confirmation)."
          : "This patient is already in the WAITING queue.";
      setActionError(`${note} Finalize it first (Confirm Admit / Outpatient / Cancelled).`);
      setCurrentQueueId(Number(blockingQueue.id));
      return;
    }

    const payload: PatientQueueReq = {
      patientId: patientSelected.id,
      triageId: predicted.id,
      priority: inferPriorityFromPrediction(predicted),
      status: "WAITING",
      admitted: false,
    } as any;

    try {
      const created = await createQueue.mutateAsync(payload);
      setCurrentQueueId(Number(created.id));
      setIsFinalized(true)
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to add to queue.");
    }
  };

  const openAdmitPopup = () => {
    setActionError(null);
    setAdmitError(null);
    setAdmitAttempted(false);

    if (!patientSelected) return setActionError("Select a patient first.");

    setAdmitDeptId("");
    setAdmitWardId("");
    setAdmitBedId("");
    setAdmitOpen(true);
  };

  const closeAdmitPopup = () => {
    setAdmitOpen(false);
    setAdmitError(null);
    setAdmitAttempted(false);
  };

  const submitAdmit = async () => {

    setAdmitAttempted(true);
    setAdmitError(null);

    if (!patientSelected) {
      setAdmitError("No patient selected.");
      return;
    }

    if (typeof admitDeptId !== "number" || typeof admitWardId !== "number" || typeof admitBedId !== "number") {
      setAdmitError("Please select Department, Ward and Bed.");
      return;
    }

    try {
      const admissionPayload: PatientAdmissionReq = {
        patientId: patientSelected.id,
        bedId: admitBedId,
        status: "ACTIVE",
      } as any;

      await createAdmission.mutateAsync(admissionPayload);

      setAdmitOpen(false);
      setIsFinalized(true)
    } catch (e: any) {
      setAdmitError(e?.message ?? "Failed to admit patient.");
    }
  };

  const predictionEnabled = !!patientSelected;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={800}>
            Triage AI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select patient → Enter vitals → Predict triage → Add to Queue / Admit
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems={"center"}>
          <Tooltip title="Reset">
            <IconButton onClick={resetAll} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Chip icon={<PsychologyIcon />} label="AI Assisted" variant="outlined" />
        </Stack>
      </Stack>

      {(patientsQuery.isError || triageQuery.isError || queuesQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientsQuery.error as any)?.message ??
            (triageQuery.error as any)?.message ??
            (queuesQuery.error as any)?.message ??
            "Failed to load data."}
        </Alert>
      )}

      {actionError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={800}>Select Patient</Typography>
              {patientSelected ? (
                <Chip color="success" label="Patient Selected" size="small" />
              ) : (
                <Chip label="Required" size="small" variant="outlined" />
              )}
            </Stack>

            <Box ref={searchBoxRef}>
              <PatientSelectWithCreate
                patients={patients}
                value={patientSelected}
                onChange={(p) => {
                  setActionError(null);
                  setPatientSelected(p);
                  setPredicted(null);
                  setCurrentQueueId(null);

                  if (p) {
                    setForm((prev) => ({
                      ...prev,
                      patientId: p.id,
                      sex: genderToSex(p.gender),
                      age: calcAge(p.dob),
                    }));

                    setTouched((prev) => ({ ...prev, patientId: true }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.patientId;
                      return next;
                    });
                  } else {
                    setForm((prev) => ({ ...prev, patientId: 0 }));
                    setTouched((t) => ({ ...t, patientId: true }));
                    setErrors((er) => ({ ...er, patientId: "Patient is required" }));
                  }
                }}
                disabled={busy}
                label="Search by NIC or Name"
              />
            </Box>

            {patientSelected && (
              <Alert severity="success">
                Selected: <b>{patientSelected.fullName ?? "—"}</b> • NIC <b>{patientSelected.nic ?? "—"}</b>
              </Alert>
            )}

            {(blockingQueue || currentQueueId) && (
              <Alert severity="info">
                Queue:{" "}
                <b>
                  {blockingQueue ? `#${blockingQueue.id}` : currentQueueId ? `#${currentQueueId}` : "—"}
                </b>{" "}
                {blockingQueue ? `• Status ${(blockingQueue.status ?? "—").toUpperCase()}` : ""}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography fontWeight={800}>Prediction Inputs</Typography>
                <Divider />

                {!predictionEnabled && (
                  <Alert severity="info">Select a patient first to enable triage input fields.</Alert>
                )}

                {predictMutation.isError && (
                  <Alert severity="error">{predictMutation.error?.message ?? "Prediction failed."}</Alert>
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      required
                      select
                      label="Sex"
                      value={form.sex}
                      onChange={(e) => onChange("sex", Number(e.target.value))}
                      onBlur={() => onBlur("sex")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.sex}
                      helperText={errors.sex}
                    >
                      <MenuItem value={0}>Female</MenuItem>
                      <MenuItem value={1}>Male</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      required
                      label="Age"
                      value={form.age}
                      onChange={(e) => onChange("age", e.target.value)}
                      onBlur={() => onBlur("age")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.age}
                      helperText={errors.age}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      select
                      label="Arrival Mode"
                      value={form.arrivalMode}
                      onChange={(e) => onChange("arrivalMode", Number(e.target.value))}
                      onBlur={() => onBlur("arrivalMode")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.arrivalMode}
                      helperText={errors.arrivalMode}
                    >
                      <MenuItem value={1}>Walking</MenuItem>
                      <MenuItem value={2}>Public Ambulance</MenuItem>
                      <MenuItem value={3}>Private Vehicle</MenuItem>
                      <MenuItem value={4}>Private Ambulance</MenuItem>
                      <MenuItem value={5}>Other 1</MenuItem>
                      <MenuItem value={6}>Other 2</MenuItem>
                      <MenuItem value={7}>Other 3</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      select
                      label="Injury"
                      value={form.injury}
                      onChange={(e) => onChange("injury", Number(e.target.value))}
                      onBlur={() => onBlur("injury")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.injury}
                      helperText={errors.injury}
                    >
                      <MenuItem value={1}>Yes</MenuItem>
                      <MenuItem value={2}>No</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      select
                      label="Pain"
                      value={form.pain}
                      onChange={(e) => onChange("pain", Number(e.target.value))}
                      onBlur={() => onBlur("pain")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.pain}
                      helperText={errors.pain}
                    >
                      <MenuItem value={0}>No</MenuItem>
                      <MenuItem value={1}>Yes</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      select
                      label="Mental Status"
                      value={form.mental}
                      onChange={(e) => onChange("mental", Number(e.target.value))}
                      onBlur={() => onBlur("mental")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.mental}
                      helperText={errors.mental}
                    >
                      <MenuItem value={1}>Alert</MenuItem>
                      <MenuItem value={2}>Verbal Response</MenuItem>
                      <MenuItem value={3}>Pain Response</MenuItem>
                      <MenuItem value={4}>Unresponsive</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      label="SBP"
                      value={form.sbp}
                      onChange={(e) => onChange("sbp", e.target.value)}
                      onBlur={() => onBlur("sbp")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.sbp}
                      helperText={errors.sbp}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      label="DBP"
                      value={form.dbp}
                      onChange={(e) => onChange("dbp", e.target.value)}
                      onBlur={() => onBlur("dbp")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.dbp}
                      helperText={errors.dbp}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      label="Heart Rate (HR)"
                      value={form.hr}
                      onChange={(e) => onChange("hr", e.target.value)}
                      onBlur={() => onBlur("hr")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.hr}
                      helperText={errors.hr}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      label="Resp. Rate (RR)"
                      value={form.rr}
                      onChange={(e) => onChange("rr", e.target.value)}
                      onBlur={() => onBlur("rr")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.rr}
                      helperText={errors.rr}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      required
                      label="Body Temp (BT)"
                      value={form.bt}
                      onChange={(e) => onChange("bt", e.target.value)}
                      onBlur={() => onBlur("bt")}
                      fullWidth
                      disabled={!predictionEnabled}
                      error={!!errors.bt}
                      helperText={errors.bt}
                      inputProps={{ inputMode: "decimal" }}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" onClick={resetAll} disabled={busy}>
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePredict}
                    disabled={busy || !predictionEnabled}
                    sx={{ backgroundColor: "#03a8dd", "&:hover": { backgroundColor: "#0288c3" } }}
                  >
                    {predictMutation.isPending ? "Predicting..." : "Predict"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography fontWeight={800}>Prediction Result</Typography>
                  <Chip label={predicted ? "Predicted" : "No Result"} size="small" />
                </Stack>
                <Divider />

                {!predicted || isFinalized ? (
                  <Alert severity="info">
                    Select patient and fill inputs, then click <b>Predict</b>.
                  </Alert>
                ) : (
                  <>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={1.2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={800}>{patientSelected?.fullName ?? "Patient"}</Typography>
                            <Chip label={`Triage ID ${predicted.id}`} size="small" />
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            {severityChip(predicted.severity, predicted.triageLevel)}
                            <Chip label={`Triage Level: ${predicted.triageLevel ?? "—"}`} size="small" />
                            <Chip label={`Queue Priority: ${inferPriorityFromPrediction(predicted)}`} size="small" variant="outlined" />
                          </Stack>

                          <Divider />

                          <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                Shock Index
                              </Typography>
                              <Typography fontWeight={800}>{predicted.shockIndex ?? "—"}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                Pulse Pressure
                              </Typography>
                              <Typography fontWeight={800}>{predicted.pulsePressure ?? "—"}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                PP Ratio
                              </Typography>
                              <Typography fontWeight={800}>{predicted.ppRatio ?? "—"}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                RR/HR Ratio
                              </Typography>
                              <Typography fontWeight={800}>{predicted.rrHrRatio ?? "—"}</Typography>
                            </Grid>
                          </Grid>

                          <Divider />

                          <Typography variant="caption" color="text.secondary">
                            Predicted at:{" "}
                            {new Date((predicted.updatedAt ?? predicted.createdAt) as any).toLocaleString()}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    {blockingQueue && (
                      <Alert severity="warning">
                        Patient already has an active queue (#{blockingQueue.id}) • Status{" "}
                        <b>{String(blockingQueue.status ?? "—").toUpperCase()}</b>. Finalize it first if needed.
                      </Alert>
                    ) || resultBoxError && <Alert severity="warning">
                        {resultBoxError}
                      </Alert>}

                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<LocalHospitalIcon />}
                        onClick={openAdmitPopup}
                        disabled={busy || !patientSelected || !predicted}
                        sx={{ backgroundColor: "#03a8dd", "&:hover": { backgroundColor: "#0288c3" } }}
                      >
                        Admit Patient
                      </Button>

                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<PlaylistAddIcon />}
                        onClick={handleAddToQueue}
                        disabled={busy || !patientSelected || !predicted}
                      >
                        Add to Queue
                      </Button>
                    </Stack>

                    <Alert severity="warning">Confirm vitals + clinical judgement before final action.</Alert>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                <Stack spacing={0.2}>
                  <Typography fontWeight={800}>Triage History</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filter and sort records
                  </Typography>
                </Stack>

                <Grid container spacing={1} sx={{ width: { xs: "100%", md: 520 } }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Triage
                        </Typography>
                        <Typography variant="h6" fontWeight={900}>
                          {triageStats.total}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Critical
                        </Typography>
                        <Typography variant="h6" fontWeight={900} color="error.main">
                          {triageStats.critical}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Non-Critical
                        </Typography>
                        <Typography variant="h6" fontWeight={900} color="success.main">
                          {triageStats.nonCritical}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Stack>

              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    label="Search (Name or NIC)"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    select
                    label="Severity Filter"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as any)}
                    fullWidth
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                    <MenuItem value="NON_CRITICAL">Non-Critical</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    select
                    label="Sort By"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    fullWidth
                  >
                    <MenuItem value="createdAt">Created</MenuItem>
                    <MenuItem value="triageLevel">Triage Level</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    select
                    label="Order"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as any)}
                    fullWidth
                  >
                    <MenuItem value="desc">Desc</MenuItem>
                    <MenuItem value="asc">Asc</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {triageQuery.isError && (
                <Alert severity="error">{triageQuery.error?.message ?? "Failed to load triage history."}</Alert>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360, overflowY: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {triageQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5}>Loading...</TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No triage records found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.slice(0, 50).map((t) => {
                        const p = patientById.get(t.patientId);
                        return (
                          <TableRow key={t.id} hover>
                            <TableCell>{`${p?.fullName ?? "—"} • NIC ${p?.nic ?? "—"}`}</TableCell>
                            <TableCell>{severityChip(t.severity, t.triageLevel)}</TableCell>
                            <TableCell>{t.triageLevel ?? "—"}</TableCell>
                            <TableCell>{new Date(t.createdAt as any).toLocaleString()}</TableCell>
                            <TableCell align="right">
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
        </Grid>
      </Grid>

      <Dialog open={admitOpen} onClose={closeAdmitPopup} fullWidth maxWidth="sm">
        <DialogTitle>Admit Patient</DialogTitle>
        <DialogContent dividers>
          {!patientSelected ? (
            <Alert severity="info">No patient selected</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={900}>{patientSelected.fullName ?? "—"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Patient ID: {patientSelected.id ?? "—"}
                  </Typography>
                </CardContent>
              </Card>

              {admitError && <Alert severity="warning">{admitError}</Alert>}

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Department"
                    fullWidth
                    value={admitDeptId}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setAdmitDeptId(v as any);
                      setAdmitWardId("");
                      setAdmitBedId("");
                      setAdmitError(null);
                    }}
                    disabled={busy || deptsQuery.isLoading}
                    error={admitAttempted && typeof admitDeptId !== "number"}
                    helperText={admitAttempted && typeof admitDeptId !== "number" ? "Required" : " "}
                  >
                    <MenuItem value="">Select department</MenuItem>
                    {depts.map((d: any) => (
                      <MenuItem key={d.id} value={d.id}>
                        {deptLabel(d)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Ward"
                    fullWidth
                    value={admitWardId}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setAdmitWardId(v as any);
                      setAdmitBedId("");
                      setAdmitError(null);
                    }}
                    disabled={busy || typeof admitDeptId !== "number" || wardsQuery.isLoading}
                    error={admitAttempted && typeof admitWardId !== "number"}
                    helperText={
                      admitAttempted && typeof admitWardId !== "number"
                        ? "Required"
                        : typeof admitDeptId !== "number"
                          ? "Select department first"
                          : " "
                    }
                  >
                    <MenuItem value="">Select ward</MenuItem>
                    {wards.map((w: any) => (
                      <MenuItem key={w.id} value={w.id}>
                        {wardLabel(w)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    label="Bed"
                    fullWidth
                    value={admitBedId}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setAdmitBedId(v as any);
                      setAdmitError(null);
                    }}
                    disabled={busy || typeof admitWardId !== "number" || bedsQuery.isLoading}
                    error={admitAttempted && typeof admitBedId !== "number"}
                    helperText={
                      admitAttempted && typeof admitBedId !== "number"
                        ? "Required"
                        : typeof admitWardId !== "number"
                          ? "Select ward first"
                          : " "
                    }
                  >
                    <MenuItem value="">Select bed</MenuItem>
                    {beds.map((b: any) =>
                      b.isTaken ? (
                        <MenuItem key={b.id} value={b.id} disabled>
                          {bedLabel(b)}
                          <Chip
                            color="error"
                            sx={{ marginLeft: 3 }}
                            label={<Typography sx={{ fontWeight: "bold" }}>Taken</Typography>}
                          />
                        </MenuItem>
                      ) : (
                        <MenuItem key={b.id} value={b.id}>
                          {bedLabel(b)}
                          <Chip
                            color="success"
                            sx={{ marginLeft: 3 }}
                            label={<Typography sx={{ fontWeight: "bold" }}>Free</Typography>}
                          />
                        </MenuItem>
                      )
                    )}
                  </TextField>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdmitPopup} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submitAdmit} variant="contained" disabled={busy || !patientSelected}>
            Admit
          </Button>
        </DialogActions>
      </Dialog>

      {/* View dialog (unchanged UI) */}
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

                    <Stack direction="row" spacing={1} alignItems="center">
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
                              <b>Injury:</b> {viewItem.injury === 1 ? "Yes" : "No"}
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
                          <b>Predicted At:</b> {new Date(viewItem.createdAt).toLocaleString()}
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
    </Box>
  );
}
