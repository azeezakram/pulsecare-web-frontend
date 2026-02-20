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

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CancelIcon from "@mui/icons-material/Cancel";
import ClearIcon from "@mui/icons-material/Clear";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EditIcon from "@mui/icons-material/Edit";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import emptyBoxAsset from "../../assets/static/symbols/empty-box.png";

import dayjs from "dayjs";

import { useAllActivePatients } from "../../features/patient/patient-service";
import type { PatientRes } from "../../features/patient/types";

import { useCheckActiveAdmission, useCreatePatientAdmission } from "../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionReq } from "../../features/patient-admission/types";

import { useAllPatientQueues, useCreatePatientQueue, useUpdatePatientQueue } from "../../features/patient-queue/patientQueue-service";
import type { PatientQueueReq, PatientQueueRes, QueuePriority, QueueStatus } from "../../features/patient-queue/types";
import { useQueueLive } from "../../features/patient-queue/useQueueLive";

import { useAllPrescriptions, usePrescriptionDetailById } from "../../features/prescription/prescription-service";
import type { PrescriptionDetailRes, PrescriptionSummaryRes } from "../../features/prescription/types";

import PatientSelectWithCreate from "../../components/dialog/PatientSelectWithCreate";
import { useBedsByWardId } from "../../features/bed/bed-service";
import { useAllDepartments } from "../../features/department/department-service";
import { useWardsByDepartmentId } from "../../features/ward/ward-service";

type SortKey = "createdAt" | "priority" | "status";
type SortDir = "asc" | "desc";

const PRIORITIES: QueuePriority[] = ["NORMAL", "CRITICAL", "NON_CRITICAL"];

function fmtDT(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : v;
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

function safeLower(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function sortQueues(list: PatientQueueRes[], key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  const priRank: Record<string, number> = { CRITICAL: 0, NON_CRITICAL: 1, NORMAL: 2 };
  const stRank: Record<string, number> = { WAITING: 0, ADMITTED: 1, OUTPATIENT: 2, CANCELLED: 3 };

  return [...list].sort((a, b) => {
    if (key === "createdAt") {
      const av = dayjs(a.createdAt).valueOf();
      const bv = dayjs(b.createdAt).valueOf();
      return (av - bv) * mul;
    }
    if (key === "priority") {
      const av = priRank[(a.priority ?? "NORMAL").toUpperCase()] ?? 999;
      const bv = priRank[(b.priority ?? "NORMAL").toUpperCase()] ?? 999;
      return (av - bv) * mul;
    }
    const av = stRank[(a.status ?? "WAITING").toUpperCase()] ?? 999;
    const bv = stRank[(b.status ?? "WAITING").toUpperCase()] ?? 999;
    return (av - bv) * mul;
  });
}

function isBlockingQueue(q: PatientQueueRes) {
  const s = (q.status ?? "").toUpperCase();
  if (s === "WAITING") return true;
  if (s === "ADMITTED") return q.admitted === false;
  return false;
}

function isLeftActive(q: PatientQueueRes) {
  const s = (q.status ?? "WAITING").toUpperCase();
  if (s === "OUTPATIENT" || s === "CANCELLED") return false;
  if (s === "WAITING") return true;
  if (s === "ADMITTED") return q.admitted === false;
  return false;
}

function isPastQueue(q: PatientQueueRes) {
  const s = (q.status ?? "").toUpperCase();
  if (s === "OUTPATIENT" || s === "CANCELLED") return true;
  if (s === "ADMITTED") return q.admitted === true;
  return false;
}

function matchesQueue(q: PatientQueueRes, term: string) {
  const t = safeLower(term);
  if (!t) return true;
  const name = safeLower(q.patientName);
  const pid = String(q.patientId ?? "");
  const triage = safeLower(String(q.triageLevel));
  const status = safeLower(q.status);
  const pr = safeLower(q.priority);
  return name.includes(t) || pid.includes(t) || triage.includes(t) || status.includes(t) || pr.includes(t);
}

function buildSuggestions(list: PatientQueueRes[], term: string, sortKey: SortKey, sortDir: SortDir) {
  const t = safeLower(term);
  if (!t) return [];
  return sortQueues(list.filter((q) => matchesQueue(q, t)), sortKey, sortDir).slice(0, 8);
}

function esc(s?: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function printPrescription(detail: PrescriptionDetailRes, meta: { patientName?: string; patientId?: number | string; triageLevel?: any }) {
  const items = detail.items ?? [];
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription #${esc(String(detail.id))}</title>
  <style>
    body{font-family: Arial, sans-serif; padding:24px; color:#111;}
    .row{display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;}
    h1{font-size:18px; margin:0 0 8px;}
    .muted{color:#666; font-size:12px;}
    .box{border:1px solid #ddd; border-radius:10px; padding:12px; margin-top:12px;}
    table{width:100%; border-collapse:collapse; margin-top:10px;}
    th,td{border:1px solid #ddd; padding:8px; font-size:12px; vertical-align:top;}
    th{text-align:left; background:#f6f6f6;}
    .badge{display:inline-block; padding:3px 8px; border:1px solid #ddd; border-radius:999px; font-size:12px;}
    .footer{margin-top:14px; font-size:12px; color:#666;}
    @media print { .no-print{display:none;} }
  </style>
</head>
<body>
  <div class="row">
    <div>
      <h1>Prescription</h1>
      <div class="muted">Printed: ${esc(dayjs().format("YYYY-MM-DD HH:mm"))}</div>
    </div>
    <div class="muted" style="text-align:right">
      <div>Prescription ID: ${esc(String(detail.id))}</div>
      <div>Status: <span class="badge">${esc(detail.status ?? "—")}</span></div>
      <div>Type: <span class="badge">${esc(detail.type ?? "—")}</span></div>
    </div>
  </div>

  <div class="box">
    <div class="row">
      <div>
        <div><b>Patient:</b> ${esc(meta.patientName ?? "—")}</div>
        <div><b>Patient ID:</b> ${esc(String(meta.patientId ?? "—"))}</div>
        <div><b>Triage:</b> ${esc(String(meta.triageLevel ?? "—"))}</div>
      </div>
      <div>
        <div><b>Doctor:</b> ${esc(detail.doctorName ?? "—")}</div>
        <div><b>Queue ID:</b> ${esc(String(detail.queueId ?? "—"))}</div>
        <div><b>Admission ID:</b> ${esc(String(detail.admissionId ?? "—"))}</div>
      </div>
    </div>
    ${detail.notes ? `<div style="margin-top:10px;"><b>Notes:</b> ${esc(detail.notes)}</div>` : ""}
  </div>

  <div class="box">
    <b>Medicines</b>
    <table>
      <thead>
        <tr>
          <th style="width:26%;">Medicine</th>
          <th style="width:14%;">Dosage</th>
          <th style="width:14%;">Frequency</th>
          <th style="width:10%;">Days</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0
      ? `<tr><td colspan="5" class="muted">No items</td></tr>`
      : items
        .map(
          (it) => `<tr>
            <td>${esc(it.medicineName ?? "—")}</td>
            <td>${esc(it.dosage ?? "—")}</td>
            <td>${esc(it.frequency ?? "—")}</td>
            <td>${esc(String(it.durationDays ?? "—"))}</td>
            <td>${esc(it.instructions ?? "—")}</td>
          </tr>`
        )
        .join("")
    }
      </tbody>
    </table>
    <div class="footer">Tip: In the print dialog, choose “Save as PDF” to download a PDF for the patient.</div>
  </div>

  <div class="no-print" style="margin-top:14px;">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <script>setTimeout(()=>window.print(), 300);</script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function prescStatusChip(v?: string) {
  const s = (v ?? "DRAFT").toUpperCase();
  if (s === "FINALIZED") return <Chip size="small" color="success" label="FINALIZED" />;
  if (s === "DISPENSED") return <Chip size="small" color="info" label="DISPENSED" />;
  return <Chip size="small" variant="outlined" label="DRAFT" />;
}

export default function NursePatientQueueManagementPage() {
  useQueueLive({ enabled: true, topic: "/topic/queue", refetchAfterEvent: false });

  const patientsQuery = useAllActivePatients();
  const queuesQuery = useAllPatientQueues();
  const hasActiveAdmissionQuery = useCheckActiveAdmission()

  const createQueue = useCreatePatientQueue();
  const updateQueue = useUpdatePatientQueue();
  const createAdmission = useCreatePatientAdmission();

  const prescriptionsQuery = useAllPrescriptions();

  const deptsQuery = useAllDepartments();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitDeptId, setAdmitDeptId] = useState<number | "">("");
  const [admitWardId, setAdmitWardId] = useState<number | "">("");
  const [admitBedId, setAdmitBedId] = useState<number | "">("");
  const [admitAttempted, setAdmitAttempted] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  const wardsQuery = useWardsByDepartmentId(typeof admitDeptId === "number" ? admitDeptId : undefined);
  const bedsQuery = useBedsByWardId(typeof admitWardId === "number" ? admitWardId : undefined);

  const [selectedPatient, setSelectedPatient] = useState<PatientRes | null>(null);
  const [addPriority, setAddPriority] = useState<QueuePriority>("NORMAL");

  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [draftPriority, setDraftPriority] = useState<QueuePriority>("NORMAL");

  const [addError, setAddError] = useState<string | null>(null);

  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);
  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);
  const prescriptions = useMemo(() => prescriptionsQuery.data ?? [], [prescriptionsQuery.data]);

  const selectedQueue = useMemo(() => {
    if (!selectedQueueId) return null;
    return queues.find((q) => q.id === selectedQueueId) ?? null;
  }, [queues, selectedQueueId]);

  const busy =
    patientsQuery.isLoading ||
    queuesQuery.isLoading ||
    createQueue.isPending ||
    updateQueue.isPending ||
    createAdmission.isPending;

  const addBlocked = useMemo(() => {
    if (!selectedPatient) return false;
    const existing = queues.filter((q) => Number(q.patientId) === selectedPatient.id);
    return existing.some(isBlockingQueue);
  }, [queues, selectedPatient]);

  const openEdit = () => {
    if (!selectedQueue) return;
    setDraftPriority((selectedQueue.priority ?? "NORMAL") as QueuePriority);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const addToQueue = async () => {
    if (!selectedPatient) return;

    setAddError(null);

    try {
      const hasActive = await hasActiveAdmissionQuery(selectedPatient.id);
      if (hasActive) {
        setAddError("This patient already has an active admission.");
        return;
      }
    } catch (e: any) {
      setAddError(e?.message ?? "Failed to check active admission.");
      return;
    }


    const existing = queues.filter((q) => Number(q.patientId) === selectedPatient.id);
    const blocking = existing.find(isBlockingQueue);

    if (blocking) {
      const st = (blocking.status ?? "WAITING").toUpperCase();
      const note = st === "ADMITTED" ? "This patient is already ADMITTED (waiting nurse confirmation)." : "This patient is already in the WAITING queue.";
      setAddError(`${note} You can add again only after finalizing (Confirmed Admit / Outpatient / Cancelled).`);
      return;
    }

    const payload: PatientQueueReq = {
      patientId: selectedPatient.id,
      priority: addPriority,
      status: "WAITING",
      admitted: false,
    };

    const created = await createQueue.mutateAsync(payload);

    setSelectedPatient(null);
    setAddPriority("NORMAL");
    setSelectedQueueId(created.id);
  };

  const saveEdit = async () => {
    if (!selectedQueue) return;

    const payload: PatientQueueReq = {
      patientId: selectedQueue.patientId,
      triageId: selectedQueue.triageId,
      priority: draftPriority,
      status: selectedQueue.status,
    };

    await updateQueue.mutateAsync({ id: selectedQueue.id, payload });
    setEditMode(false);
  };

  const setCancelled = async (q: PatientQueueRes) => {
    const payload: PatientQueueReq = {
      patientId: q.patientId,
      triageId: q.triageId,
      priority: q.priority,
      status: "CANCELLED",
      admitted: false,
    };
    await updateQueue.mutateAsync({ id: q.id, payload });
    if (selectedQueueId === q.id) setSelectedQueueId(null);
  };

  const setOutpatient = async () => {
    if (!selectedQueue) return;

    const payload: PatientQueueReq = {
      patientId: selectedQueue.patientId,
      triageId: selectedQueue.triageId,
      priority: selectedQueue.priority,
      status: "OUTPATIENT",
      admitted: false,
    };

    await updateQueue.mutateAsync({ id: selectedQueue.id, payload });
    setSelectedQueueId(null);
  };

  const openAdmitPopup = () => {
    if (!selectedQueue) return;
    setAdmitError(null);
    setAdmitAttempted(false);
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

  // const admitValid = useMemo(() => {
  //   return typeof admitDeptId === "number" && typeof admitWardId === "number" && typeof admitBedId === "number" && !!selectedQueue?.id && !!selectedQueue?.patientId;
  // }, [admitDeptId, admitWardId, admitBedId, selectedQueue?.id, selectedQueue?.patientId]);


  const submitAdmit = async () => {
    if (!selectedQueue) return;

    setAdmitAttempted(true);
    setAdmitError(null);

    if (
      typeof admitDeptId !== "number" ||
      typeof admitWardId !== "number" ||
      typeof admitBedId !== "number"
    ) {
      setAdmitError("Please select Department, Ward and Bed.");
      return;
    }

    const admissionPayload: PatientAdmissionReq = {
      patientId: selectedQueue.patientId,
      queueId: selectedQueue.id,
      bedId: admitBedId,
      status: "ACTIVE",
    };

    await createAdmission.mutateAsync(admissionPayload);

    const queuePayload: PatientQueueReq = {
      patientId: selectedQueue.patientId,
      triageId: selectedQueue.triageId,
      priority: selectedQueue.priority,
      status: "ADMITTED",
      admitted: true,
    } as any;

    await updateQueue.mutateAsync({
      id: selectedQueue.id,
      payload: queuePayload,
    });

    setAdmitOpen(false);
    setSelectedQueueId(null);
  };


  const stats = useMemo(() => {
    const total = queues.length;
    const waiting = queues.filter((q) => (q.status ?? "").toUpperCase() === "WAITING").length;
    const admitted = queues.filter((q) => (q.status ?? "").toUpperCase() === "ADMITTED").length;
    const haveToAdmit = queues.filter((q) => (q.status ?? "").toUpperCase() === "ADMITTED" && q.admitted === false).length;
    const outpatient = queues.filter((q) => (q.status ?? "").toUpperCase() === "OUTPATIENT").length;
    const cancelled = queues.filter((q) => (q.status ?? "").toUpperCase() === "CANCELLED").length;
    return { total, waiting, admitted, haveToAdmit, outpatient, cancelled };
  }, [queues]);

  const leftQueues = useMemo(() => sortQueues(queues.filter(isLeftActive), "createdAt", "asc"), [queues]);
  const pastQueues = useMemo(() => sortQueues(queues.filter(isPastQueue), "createdAt", "desc"), [queues]);

  const [activeSearch, setActiveSearch] = useState("");
  const [activeSortKey, setActiveSortKey] = useState<SortKey>("createdAt");
  const [activeSortDir, setActiveSortDir] = useState<SortDir>("asc");

  const activeSearchRef = useRef<HTMLDivElement | null>(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState<HTMLElement | null>(null);
  const [activeAnchorWidth, setActiveAnchorWidth] = useState(0);
  const [activeSuggestOpen, setActiveSuggestOpen] = useState(false);

  useEffect(() => {
    const el = activeSearchRef.current;
    if (!el) return;
    setActiveAnchorEl(el);
    const updateWidth = () => setActiveAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeSuggestions = useMemo(() => buildSuggestions(leftQueues, activeSearch, activeSortKey, activeSortDir), [leftQueues, activeSearch, activeSortKey, activeSortDir]);

  const [historySearch, setHistorySearch] = useState("");
  const [historySortKey, setHistorySortKey] = useState<SortKey>("createdAt");
  const [historySortDir, setHistorySortDir] = useState<SortDir>("desc");

  const historySearchRef = useRef<HTMLDivElement | null>(null);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<HTMLElement | null>(null);
  const [historyAnchorWidth, setHistoryAnchorWidth] = useState(0);
  const [historySuggestOpen, setHistorySuggestOpen] = useState(false);

  useEffect(() => {
    const el = historySearchRef.current;
    if (!el) return;
    setHistoryAnchorEl(el);
    const updateWidth = () => setHistoryAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const historySuggestions = useMemo(() => buildSuggestions(pastQueues, historySearch, historySortKey, historySortDir), [pastQueues, historySearch, historySortKey, historySortDir]);
  const historySorted = useMemo(() => sortQueues(pastQueues, historySortKey, historySortDir), [pastQueues, historySortKey, historySortDir]);

  const [historyViewOpen, setHistoryViewOpen] = useState(false);
  const [historyViewQueue, setHistoryViewQueue] = useState<PatientQueueRes | null>(null);

  const openHistoryView = (q: PatientQueueRes) => {
    setHistoryViewQueue(q);
    setHistoryViewOpen(true);
  };

  const closeHistoryView = () => {
    setHistoryViewOpen(false);
    setHistoryViewQueue(null);
  };

  const selectedQueuePrescriptions = useMemo(() => {
    if (!selectedQueue) return [];
    return prescriptions.filter((p) => Number((p as any).queueId) === Number(selectedQueue.id)).sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }, [prescriptions, selectedQueue]);

  const historyQueuePrescriptions = useMemo(() => {
    if (!historyViewQueue) return [];
    return prescriptions.filter((p) => Number((p as any).queueId) === Number(historyViewQueue.id)).sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }, [prescriptions, historyViewQueue]);

  const [prescViewOpen, setPrescViewOpen] = useState(false);
  const [prescViewId, setPrescViewId] = useState<number | undefined>(undefined);
  const prescDetailQuery = usePrescriptionDetailById(prescViewId);

  const openPrescription = (id: number) => {
    setPrescViewId(id);
    setPrescViewOpen(true);
  };
  const closePrescription = () => {
    setPrescViewOpen(false);
    setPrescViewId(undefined);
  };

  const printFromDetail = (detail?: PrescriptionDetailRes, q?: PatientQueueRes | null) => {
    if (!detail) return;
    printPrescription(detail, { patientName: q?.patientName, patientId: q?.patientId, triageLevel: q?.triageLevel });
  };

  const canShowPrescriptionSection = useMemo(() => {
    if (!selectedQueue) return false;
    const s = String(selectedQueue.status ?? "").toUpperCase();
    return s === "OUTPATIENT" || s === "ADMITTED";
  }, [selectedQueue]);

  const depts = useMemo(() => deptsQuery.data ?? [], [deptsQuery.data]);
  const wards = useMemo(() => wardsQuery.data ?? [], [wardsQuery.data]);
  const beds = useMemo(() => bedsQuery.data ?? [], [bedsQuery.data]);

  const deptLabel = (d: any) => d?.name ?? d?.deptName ?? d?.departmentName ?? `Department #${d?.id ?? "—"}`;
  const wardLabel = (w: any) => w?.name ?? w?.wardName ?? `Ward #${w?.id ?? "—"}`;
  const bedLabel = (b: any) => b?.bedNo ?? b?.name ?? `Bed #${b?.id ?? "—"}`;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>
            Patient Queue Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live queue • Nurse confirm admission • Outpatient / Cancel finalize
          </Typography>
        </Stack>
        <Chip label="Nurse View" variant="outlined" />
      </Stack>

      {(patientsQuery.isError || queuesQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(patientsQuery.error as any)?.message ?? (queuesQuery.error as any)?.message ?? "Failed to load data."}
        </Alert>
      )}

      {prescriptionsQuery.isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {(prescriptionsQuery.error as any)?.message ?? "Failed to load prescriptions."}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900}>Add Patient to Queue</Typography>
          <Divider sx={{ my: 1.5 }} />

          {addError && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {addError}
            </Alert>
          )}

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <PatientSelectWithCreate
                patients={patients}
                value={selectedPatient}
                onChange={(p) => {
                  setSelectedPatient(p);
                  setAddError(null);
                }}
                disabled={busy}
                label="Select patient"

              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Priority" value={addPriority} onChange={(e) => setAddPriority(e.target.value as QueuePriority)} fullWidth disabled={busy}>
                {PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={addToQueue} disabled={!selectedPatient || busy || addBlocked}>
                Add
              </Button>
            </Grid>

            {addBlocked && selectedPatient && (
              <Alert severity="warning" sx={{ mt: 1, width: "100%" }}>
                Patient already has an active queue. Finalize it first.
              </Alert>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Stack spacing={0.2}>
                  <Typography fontWeight={900}>Current Active Queue</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shows WAITING + ADMITTED (admitted=false) only
                  </Typography>
                </Stack>
                <Chip size="small" label={`${leftQueues.length} item(s)`} />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Box ref={activeSearchRef}>
                    <TextField
                      label="Search active queue"
                      placeholder="patient name / patientId / triage / status"
                      value={activeSearch}
                      onChange={(e) => {
                        setActiveSearch(e.target.value);
                        setActiveSuggestOpen(true);
                      }}
                      onFocus={() => {
                        setActiveSuggestOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setActiveSuggestOpen(false);
                      }}
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setActiveSearch("");
                              setActiveSuggestOpen(false);
                            }}
                          >
                            <ClearIcon />
                          </IconButton>
                        ),
                      }}
                    />
                  </Box>

                  <Popper
                    open={activeSuggestOpen && !!activeSearch.trim() && !!activeAnchorEl}
                    anchorEl={activeAnchorEl}
                    placement="bottom-start"
                    style={{ zIndex: 1300, width: activeAnchorWidth }}
                  >
                    <ClickAwayListener onClickAway={() => setActiveSuggestOpen(false)}>
                      <Paper variant="elevation" sx={{ mt: 1, maxHeight: 280, overflowY: "auto" }}>
                        {activeSuggestions.length === 0 ? (
                          <Box sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              No matches
                            </Typography>
                          </Box>
                        ) : (
                          <Stack divider={<Divider />} sx={{ p: 0.5 }}>
                            {activeSuggestions.map((q) => (
                              <Box
                                key={q.id}
                                sx={{ p: 1, cursor: "pointer" }}
                                onClick={() => {
                                  setActiveSuggestOpen(false);
                                  setSelectedQueueId(q.id);
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
                                  Patient: {q.patientId ?? "—"} • Triage: {q.triageLevel ?? "—"} • {fmtDT(q.createdAt)}
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
                    <TextField select label="Sort by" value={activeSortKey} onChange={(e) => setActiveSortKey(e.target.value as SortKey)} fullWidth>
                      <MenuItem value="createdAt">Created</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                    </TextField>

                    <Tooltip title={activeSortDir === "asc" ? "Ascending" : "Descending"}>
                      <IconButton onClick={() => setActiveSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                        {activeSortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>

                  {queuesQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading…</TableCell>
                    </TableRow>
                  ) : leftQueues.length === 0 ? (
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ borderBottom: "none", padding: 0 }}>
                          <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} sx={{ py: 2, width: "100%", textAlign: "center" }}>
                            <Avatar src={emptyBoxAsset} sx={{ width: 150, height: 150, mb: 2 }} />
                            <p style={{ margin: 0, fontWeight: "bold", color: "gray" }}>No queue items</p>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ) : (
                    <TableBody>
                      {leftQueues.map((q) => {
                        const isSelected = selectedQueueId === q.id;
                        return (
                          <TableRow key={q.id} hover selected={isSelected} onClick={() => setSelectedQueueId(q.id)} sx={{ cursor: "pointer" }}>
                            <TableCell>
                              <Stack spacing={0.2}>
                                <Typography fontWeight={800}>{q.patientName ?? "—"}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Patient: {q.patientId ?? "—"} • Triage: {q.triageLevel ?? "—"}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{priorityChip(q.priority)}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {statusChip(q.status)}
                                {q.status === "ADMITTED" && q.admitted === false && <Chip size="small" color="warning" variant="outlined" label="NEEDS NURSE CONFIRM" />}
                              </Stack>
                            </TableCell>
                            <TableCell>{fmtDT(q.createdAt)}</TableCell>

                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="View">
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedQueueId(q.id);
                                    }}
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Edit">
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedQueueId(q.id);
                                      setDraftPriority((q.priority ?? "NORMAL") as QueuePriority);
                                      setEditMode(true);
                                    }}
                                    disabled={busy}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>

                                {q?.status != "ADMITTED" && (
                                  <Tooltip title="Cancel queue item">
                                    <IconButton
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCancelled(q);
                                      }}
                                      disabled={busy}
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  )}
                </Table>
              </TableContainer>

              {(updateQueue.isError || createQueue.isError) && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {(updateQueue.error as any)?.message ?? (createQueue.error as any)?.message ?? "Action failed."}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={0.6} sx={{ mb: 1.5 }}>
                <Typography fontWeight={900}>Selected Queue</Typography>
                <Typography variant="body2" color="text.secondary">
                  Details + Update side-by-side
                </Typography>
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              {!selectedQueue ? (
                <Stack direction="column" justifyContent="center" alignItems="center" spacing={5} sx={{ py: 2, width: "100%" }}>
                  <Avatar src={emptyBoxAsset} sx={{ width: 180, height: 180 }} />
                  <p style={{ margin: 0, fontWeight: "bold", color: "gray" }}>No selected queue item</p>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                            <Typography fontWeight={900} noWrap>
                              {selectedQueue.patientName ?? "—"}
                            </Typography>
                            {statusChip(selectedQueue.status)}
                          </Stack>

                          <Divider sx={{ my: 1 }} />

                          <Typography variant="body2">
                            <b>Patient:</b> {selectedQueue.patientId ?? "—"}
                          </Typography>
                          <Typography variant="body2">
                            <b>Triage:</b> {selectedQueue.triageLevel ?? "—"}
                          </Typography>
                          <Typography variant="body2">
                            <b>Priority:</b> {(selectedQueue.priority ?? "NORMAL").toUpperCase()}
                          </Typography>
                          <Typography variant="body2">
                            <b>Created:</b> {fmtDT(selectedQueue.createdAt)}
                          </Typography>

                          {selectedQueue.status === "ADMITTED" && selectedQueue.admitted === false && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                              Needs nurse confirmation to finalize admission.
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
                            <Typography fontWeight={900}>Update</Typography>
                            {editMode ? <Chip size="small" label="Editing" /> : <Chip size="small" variant="outlined" label="Read-only" />}
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />

                          <TextField
                            select
                            label="Priority"
                            value={draftPriority}
                            onChange={(e) => setDraftPriority(e.target.value as QueuePriority)}
                            fullWidth
                            disabled={!editMode || busy}
                            sx={{ mb: 1.5 }}
                          >
                            {PRIORITIES.map((p) => (
                              <MenuItem key={p} value={p}>
                                {p}
                              </MenuItem>
                            ))}
                          </TextField>

                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {!editMode ? (
                              <Button variant="outlined" onClick={openEdit} disabled={busy}>
                                Edit
                              </Button>
                            ) : (
                              <>
                                <Button variant="outlined" onClick={cancelEdit} disabled={busy}>
                                  Cancel
                                </Button>
                                <Button variant="contained" onClick={saveEdit} disabled={busy}>
                                  Save
                                </Button>
                              </>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                        <Typography fontWeight={900}>Prescriptions</Typography>
                        <Chip size="small" label={`${selectedQueuePrescriptions.length} item(s)`} />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      {!canShowPrescriptionSection ? (
                        <Alert severity="info">Prescriptions are available for OUTPATIENT or ADMITTED patients.</Alert>
                      ) : prescriptionsQuery.isLoading ? (
                        <Alert severity="info">Loading prescriptions…</Alert>
                      ) : selectedQueuePrescriptions.length === 0 ? (
                        <Alert severity="warning">No prescriptions for this patient/queue.</Alert>
                      ) : (
                        <Stack spacing={1}>
                          {selectedQueuePrescriptions.map((p: PrescriptionSummaryRes) => (
                            <Paper key={p.id} variant="outlined" sx={{ p: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                                <Stack spacing={0.2}>
                                  <Typography fontWeight={800}>Prescription #{p.id}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Doctor: {p.doctorName ?? "—"} • {fmtDT(p.createdAt)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Chip size="small" variant="outlined" label={(p.type ?? "—").toUpperCase()} />
                                  {prescStatusChip(p.status)}
                                  <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => openPrescription(Number(p.id))}>
                                    View
                                  </Button>
                                  <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => openPrescription(Number(p.id))}>
                                    Print
                                  </Button>
                                </Stack>
                              </Stack>
                            </Paper>
                          ))}
                          <Alert severity="info">
                            Print opens the browser print dialog. Choose <b>Save as PDF</b> to generate a PDF for the patient.
                          </Alert>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="outlined">
                    <CardContent>
                      <Typography fontWeight={900} sx={{ mb: 1 }}>
                        Finalize
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="stretch">
                        <Button
                          startIcon={<LocalHospitalIcon />}
                          variant="contained"
                          onClick={openAdmitPopup}
                          disabled={busy || (selectedQueue.status ?? "").toUpperCase() !== "ADMITTED" || selectedQueue.admitted === true}
                          fullWidth
                        >
                          Confirm Admit
                        </Button>

                        <Button startIcon={<DoneAllIcon />} variant="outlined" onClick={setOutpatient} disabled={busy} fullWidth>
                          Outpatient
                        </Button>

                        <Button startIcon={<CancelIcon />} variant="outlined" color="error" onClick={() => setCancelled(selectedQueue)} disabled={busy} fullWidth>
                          Cancel
                        </Button>
                      </Stack>

                      {(createAdmission.isError || updateQueue.isError) && (
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {(createAdmission.error as any)?.message ?? (updateQueue.error as any)?.message ?? "Finalize failed."}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ✅ NEW: ADMISSION POPUP */}
      <Dialog open={admitOpen} onClose={closeAdmitPopup} fullWidth maxWidth="sm">
        <DialogTitle>Admit Patient</DialogTitle>
        <DialogContent dividers>
          {!selectedQueue ? (
            <Alert severity="info">No queue selected</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={900}>{selectedQueue.patientName ?? "—"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Patient ID: {selectedQueue.patientId ?? "—"} • Queue ID: {selectedQueue.id ?? "—"}
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
                      b.isTaken ?

                        <MenuItem key={b.id} value={b.id} disabled>
                          {bedLabel(b)}
                          <Chip color="error" sx={{ marginLeft: 3 }} label={
                            <Typography sx={{ fontWeight: 'bold' }}>
                              Taken
                            </Typography>
                          } />
                        </MenuItem>
                        : <MenuItem key={b.id} value={b.id} >
                          {bedLabel(b)}
                          <Chip color="success" sx={{ marginLeft: 3 }} label={
                            <Typography sx={{ fontWeight: 'bold' }}>
                              Free
                            </Typography>
                          } />
                        </MenuItem>
                    )}
                  </TextField>
                </Grid>
              </Grid>

              {/* <Alert severity="info">
                When you click <b>Admit</b>, the admission will be created with <b>Status=ACTIVE</b> and the queue will be updated to <b>ADMITTED (admitted=true)</b>.
              </Alert> */}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdmitPopup} variant="outlined" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submitAdmit} variant="contained" disabled={busy || !selectedQueue}>
            Admit
          </Button>
        </DialogActions>
      </Dialog>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip label={`Total: ${stats.total}`} />
            <Chip color="info" label={`WAITING: ${stats.waiting}`} />
            <Chip color="warning" label={`ADMITTED: ${stats.admitted}`} />
            <Chip variant="outlined" color="warning" label={`Have to admit: ${stats.haveToAdmit}`} />
            <Chip color="success" label={`OUTPATIENT: ${stats.outpatient}`} />
            <Chip label={`CANCELLED: ${stats.cancelled}`} />
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={900}>Queue History</Typography>
                <Chip size="small" label={`${historySorted.length} item(s)`} />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Box ref={historySearchRef}>
                    <TextField
                      label="Search history"
                      placeholder="patient name / patientId / triage / status"
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistorySuggestOpen(true);
                      }}
                      onFocus={() => {
                        setHistorySuggestOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setHistorySuggestOpen(false);
                      }}
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setHistorySearch("");
                              setHistorySuggestOpen(false);
                            }}
                          >
                            <ClearIcon />
                          </IconButton>
                        ),
                      }}
                    />
                  </Box>

                  <Popper
                    open={historySuggestOpen && !!historySearch.trim() && !!historyAnchorEl}
                    anchorEl={historyAnchorEl}
                    placement="bottom-start"
                    style={{ zIndex: 1300, width: historyAnchorWidth }}
                  >
                    <ClickAwayListener onClickAway={() => setHistorySuggestOpen(false)}>
                      <Paper variant="elevation" sx={{ mt: 1, maxHeight: 280, overflowY: "auto" }}>
                        {historySuggestions.length === 0 ? (
                          <Box sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              No matches
                            </Typography>
                          </Box>
                        ) : (
                          <Stack divider={<Divider />} sx={{ p: 0.5 }}>
                            {historySuggestions.map((q) => (
                              <Box
                                key={q.id}
                                sx={{ p: 1, cursor: "pointer" }}
                                onClick={() => {
                                  setHistorySuggestOpen(false);
                                  openHistoryView(q);
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
                                  Patient: {q.patientId ?? "—"} • Triage: {q.triageLevel ?? "—"} • {fmtDT(q.createdAt)}
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
                    <TextField select label="Sort by" value={historySortKey} onChange={(e) => setHistorySortKey(e.target.value as SortKey)} fullWidth>
                      <MenuItem value="createdAt">Created</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                    </TextField>

                    <Tooltip title={historySortDir === "asc" ? "Ascending" : "Descending"}>
                      <IconButton onClick={() => setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                        {historySortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>

              {queuesQuery.isLoading ? (
                <Alert severity="info">Loading history…</Alert>
              ) : historySorted.length === 0 ? (
                <Stack direction="column" justifyContent="center" alignItems="center" spacing={5} sx={{ py: 2, width: "100%" }}>
                  <Avatar src={emptyBoxAsset} sx={{ width: 180, height: 180 }} />
                  <p style={{ margin: 0, fontWeight: "bold", color: "gray" }}>No selected queue item</p>
                </Stack>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Patient</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Admitted?</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">View</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {historySorted.map((q) => (
                        <TableRow key={q.id} hover>
                          <TableCell>
                            <Stack spacing={0.2}>
                              <Typography fontWeight={800}>{q.patientName ?? "—"}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Patient: {q.patientId ?? "—"} • Triage: {q.triageLevel ?? "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>{priorityChip(q.priority)}</TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {statusChip(q.status)}
                              {String(q.status ?? "").toUpperCase() === "ADMITTED" && q.admitted === true && <Chip size="small" color="success" variant="outlined" label="CONFIRMED" />}
                            </Stack>
                          </TableCell>

                          <TableCell>{q.admitted ? "Yes" : "No"}</TableCell>
                          <TableCell>{fmtDT(q.createdAt)}</TableCell>

                          <TableCell align="right">
                            <Tooltip title="View details">
                              <IconButton onClick={() => openHistoryView(q)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* --- your existing History View Dialog + Prescription Dialog remain unchanged --- */}

      <Dialog open={historyViewOpen} onClose={closeHistoryView} fullWidth maxWidth="md">
        <DialogTitle>History Queue Details</DialogTitle>
        <DialogContent dividers>
          {!historyViewQueue ? (
            <Alert severity="info">No item selected</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                <Typography fontWeight={900}>{historyViewQueue.patientName ?? "—"}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {priorityChip(historyViewQueue.priority)}
                  {statusChip(historyViewQueue.status)}
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={1}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <b>Queue ID:</b> {historyViewQueue.id ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Patient ID:</b> {historyViewQueue.patientId ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Triage:</b> {historyViewQueue.triageLevel ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Priority:</b> {(historyViewQueue.priority ?? "NORMAL").toUpperCase()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <b>Status:</b> {(historyViewQueue.status ?? "—").toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    <b>Admitted:</b> {historyViewQueue.admitted ? "Yes" : "No"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Created:</b> {fmtDT(historyViewQueue.createdAt)}
                  </Typography>
                  {(historyViewQueue as any)?.updatedAt && (
                    <Typography variant="body2">
                      <b>Updated:</b> {fmtDT((historyViewQueue as any).updatedAt)}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                <Typography fontWeight={900}>Prescriptions</Typography>
                <Chip size="small" label={`${historyQueuePrescriptions.length} item(s)`} />
              </Stack>

              {prescriptionsQuery.isLoading ? (
                <Alert severity="info">Loading prescriptions…</Alert>
              ) : historyQueuePrescriptions.length === 0 ? (
                <Alert severity="warning">No prescriptions for this history record.</Alert>
              ) : (
                <Stack spacing={1}>
                  {historyQueuePrescriptions.map((p: PrescriptionSummaryRes) => (
                    <Paper key={p.id} variant="outlined" sx={{ p: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                        <Stack spacing={0.2}>
                          <Typography fontWeight={800}>Prescription #{p.id}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Doctor: {p.doctorName ?? "—"} • {fmtDT(p.createdAt)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip size="small" variant="outlined" label={(p.type ?? "—").toUpperCase()} />
                          {prescStatusChip(p.status)}
                          <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => openPrescription(Number(p.id))}>
                            View
                          </Button>
                          <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => openPrescription(Number(p.id))}>
                            Print
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistoryView} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={prescViewOpen} onClose={closePrescription} fullWidth maxWidth="md">
        <DialogTitle>Prescription</DialogTitle>
        <DialogContent dividers>
          {prescDetailQuery.isLoading ? (
            <Alert severity="info">Loading prescription details…</Alert>
          ) : prescDetailQuery.isError ? (
            <Alert severity="error">{(prescDetailQuery.error as any)?.message ?? "Failed to load prescription details."}</Alert>
          ) : !prescDetailQuery.data ? (
            <Alert severity="warning">No data</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                <Typography fontWeight={900}>Prescription #{prescDetailQuery.data.id}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip size="small" variant="outlined" label={(prescDetailQuery.data.type ?? "—").toUpperCase()} />
                  {prescStatusChip(prescDetailQuery.data.status)}
                  <Button variant="contained" startIcon={<PrintIcon />} onClick={() => printFromDetail(prescDetailQuery.data!, selectedQueue ?? historyViewQueue)}>
                    Print / Save as PDF
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={1}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <b>Doctor:</b> {prescDetailQuery.data.doctorName ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Queue ID:</b> {prescDetailQuery.data.queueId ?? "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Admission ID:</b> {prescDetailQuery.data.admissionId ?? "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    <b>Created:</b> {fmtDT(prescDetailQuery.data.createdAt)}
                  </Typography>
                  <Typography variant="body2">
                    <b>Updated:</b> {fmtDT(prescDetailQuery.data.updatedAt)}
                  </Typography>
                </Grid>
              </Grid>

              {prescDetailQuery.data.notes && (
                <>
                  <Divider />
                  <Typography variant="body2">
                    <b>Notes:</b> {prescDetailQuery.data.notes}
                  </Typography>
                </>
              )}

              <Divider />

              <Typography fontWeight={900}>Medicines</Typography>

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
                    {(prescDetailQuery.data.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No items</TableCell>
                      </TableRow>
                    ) : (
                      (prescDetailQuery.data.items ?? []).map((it) => (
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

              <Alert severity="info">
                Printing uses the browser print dialog. Choose <b>Save as PDF</b> to generate the PDF.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePrescription} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}