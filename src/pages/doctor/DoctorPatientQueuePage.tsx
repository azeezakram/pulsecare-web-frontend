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
  IconButton,
  MenuItem,
  Grid,
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
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CancelIcon from "@mui/icons-material/Cancel";
import ClearIcon from "@mui/icons-material/Clear";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import emptyBoxAsset from "../../assets/static/symbols/empty-box.png";

import dayjs from "dayjs";

import { useAllPatientQueues, useUpdatePatientQueue } from "../../features/patient-queue/patientQueue-service";
import type { PatientQueueReq, PatientQueueRes, QueuePriority, QueueStatus } from "../../features/patient-queue/types";
import { useQueueLive } from "../../features/patient-queue/useQueueLive";

import { useAllPrescriptions, useCreatePrescription, usePrescriptionDetailById } from "../../features/prescription/prescription-service";
import type { PrescriptionDetailRes, PrescriptionReq, PrescriptionSummaryRes } from "../../features/prescription/types";
import { useAuthStore } from "../../store/auth-store";

type SortKey = "createdAt" | "priority" | "status";
type SortDir = "asc" | "desc";

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
  const triage = safeLower(String(q.triageLevel));
  const status = safeLower(q.status);
  const pr = safeLower(q.priority);
  return name.includes(t) || pid.includes(t) || triage.includes(t) || status.includes(t) || pr.includes(t);
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

function esc(s?: string) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prescStatusChip(v?: string) {
  const s = (v ?? "DRAFT").toUpperCase();
  if (s === "FINALIZED") return <Chip size="small" color="success" label="FINALIZED" />;
  if (s === "DISPENSED") return <Chip size="small" color="info" label="DISPENSED" />;
  return <Chip size="small" variant="outlined" label="DRAFT" />;
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
    <div class="footer">Choose “Save as PDF” in print dialog to download a PDF.</div>
  </div>

  <div class="no-print" style="margin-top:14px;">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
</body>
</html>`;

  const w = window.open("about:blank", "_blank", "width=900,height=700");
  if (!w) return;

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();

  setTimeout(() => {
    try {
      w.print();
    } catch {
      try {
        w.focus();
        w.print();
      } catch {
        void 0;
      }
    }
  }, 250);
}

function buildSuggestions(list: PatientQueueRes[], term: string, sortKey: SortKey, sortDir: SortDir) {
  const t = safeLower(term);
  if (!t) return [];
  return sortQueues(list.filter((q) => matchesQueue(q, t)), sortKey, sortDir).slice(0, 8);
}

export default function DoctorQueuePatientPage() {
  useQueueLive({ enabled: true, topic: "/topic/queue", refetchAfterEvent: false });
  const doctorId = useAuthStore((s) => s.currentUser?.id);

  const queuesQuery = useAllPatientQueues();
  const updateQueue = useUpdatePatientQueue();

  const prescriptionsQuery = useAllPrescriptions();
  const createPrescription = useCreatePrescription();

  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);
  const prescriptions = useMemo(() => prescriptionsQuery.data ?? [], [prescriptionsQuery.data]);

  const waitingQueues = useMemo(() => {
    const list = queues.filter((q) => String(q.status ?? "").toUpperCase() === "WAITING");
    return sortQueues(list, "createdAt", "asc");
  }, [queues]);

  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);

  const selectedQueue = useMemo(() => {
    if (!selectedQueueId) return null;
    return queues.find((q) => q.id === selectedQueueId) ?? null;
  }, [queues, selectedQueueId]);

  const busy = queuesQuery.isLoading || updateQueue.isPending || prescriptionsQuery.isLoading || createPrescription.isPending;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const searchRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorW, setAnchorW] = useState(0);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [overlayOpen, setOverlayOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<QueueStatus | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>("Confirm");
  const [confirmBody, setConfirmBody] = useState<string>("Are you sure?");

  const [prescEnabled, setPrescEnabled] = useState(false);

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    setAnchorEl(el);
    const update = () => setAnchorW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const suggestions = useMemo(() => buildSuggestions(waitingQueues, search, sortKey, sortDir), [waitingQueues, search, sortKey, sortDir]);

  const doctorQueuePrescriptions = useMemo(() => {
    if (!selectedQueue) return [];
    return prescriptions
      .filter((p) => Number((p as any).queueId) === Number(selectedQueue.id))
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }, [prescriptions, selectedQueue]);

  const [prescOpen, setPrescOpen] = useState(false);
  const [prescId, setPrescId] = useState<number | undefined>(undefined);
  const prescDetailQuery = usePrescriptionDetailById(prescId);

  const openPrescription = (id: number) => {
    setPrescId(id);
    setPrescOpen(true);
  };
  const closePrescription = () => {
    setPrescOpen(false);
    setPrescId(undefined);
  };

  const [notes, setNotes] = useState("");
  const [type, setType] = useState<"OPD" | "IPD">("OPD");
  const [items, setItems] = useState<
    Array<{ medicineName: string; dosage: string; frequency: string; durationDays: number; instructions: string }>
  >([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);

  const resetSelectedSection = () => {
    setSelectedQueueId(null);
    setNotes("");
    setType("OPD");
    setItems([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
    setPrescEnabled(false);
  };

  useEffect(() => {
    if (!selectedQueue) return;
    const s = String(selectedQueue.status ?? "").toUpperCase();
    const set = () => {
      setType(s === "ADMITTED" ? "IPD" : "OPD");
      setNotes("");
      setItems([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
      setPrescEnabled(false);
    }
    set()
  }, [selectedQueue, selectedQueue?.id]);

  const addItem = () => setItems((prev) => [...prev, { medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const setItem = (idx: number, key: keyof (typeof items)[number], val: any) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const itemErrors = useMemo(() => {
    return items.map((it) => {
      const medicine = !it.medicineName?.trim();
      const dosage = !it.dosage?.trim();
      const frequency = !it.frequency?.trim();
      const days = !(Number(it.durationDays) > 0);
      return { medicine, dosage, frequency, days };
    });
  }, [items]);

  const formValid = useMemo(() => itemErrors.every((e) => !e.medicine && !e.dosage && !e.frequency && !e.days), [itemErrors]);

  const askConfirm = (status: QueueStatus) => {
    if (!selectedQueue) return;
    setConfirmStatus(status);

    if (status === "ADMITTED") {
      setConfirmTitle("Confirm Admit");
      setConfirmBody(`Admit ${selectedQueue.patientName ?? "this patient"}?`);
    } else if (status === "OUTPATIENT") {
      setConfirmTitle("Confirm Outpatient");
      setConfirmBody(`Mark ${selectedQueue.patientName ?? "this patient"} as Outpatient?`);
    } else {
      setConfirmTitle("Confirm Cancel");
      setConfirmBody(`Cancel ${selectedQueue.patientName ?? "this patient"} from queue?`);
    }

    setConfirmOpen(true);
  };

  const doUpdateQueue = async (status: QueueStatus) => {
    if (!selectedQueue) return;

    const payload: PatientQueueReq = {
      patientId: selectedQueue.patientId,
      triageId: (selectedQueue as any).triageId,
      priority: selectedQueue.priority,
      status,
      admitted: status === "ADMITTED" ? false : undefined,
    } as any;

    await updateQueue.mutateAsync({ id: selectedQueue.id, payload });
    resetSelectedSection();
  };

  const onConfirmYes = async () => {
    if (!confirmStatus) return;
    const st = confirmStatus;
    setConfirmOpen(false);
    setConfirmStatus(null);
    await doUpdateQueue(st);
  };

  const onConfirmNo = () => {
    setConfirmOpen(false);
    setConfirmStatus(null);
  };

  const createNewPrescription = async () => {
    if (!selectedQueue) return;
    if (!prescEnabled) return;
    if (!formValid) return;

    const cleaned = items.map((it) => ({
      medicineName: it.medicineName?.trim(),
      dosage: it.dosage?.trim(),
      frequency: it.frequency?.trim(),
      durationDays: Number(it.durationDays || 0),
      instructions: it.instructions?.trim(),
    }));

    const payload: PrescriptionReq = {
      doctorId: String(doctorId),
      queueId: selectedQueue.id,
      admissionId: (selectedQueue as any).admissionId ?? undefined,
      type,
      notes: notes?.trim() || undefined,
      items: cleaned.map((it) => ({
        medicineName: it.medicineName,
        dosage: it.dosage,
        frequency: it.frequency,
        durationDays: it.durationDays,
        instructions: it.instructions || undefined,
      })),
    };

    const created = await createPrescription.mutateAsync(payload as any);

    setNotes("");
    setItems([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
    setPrescEnabled(false);

    openPrescription(Number((created as any)?.id ?? created));
  };

  const canPrescription = useMemo(() => {
    if (!selectedQueue) return false;
    const s = String(selectedQueue.status ?? "").toUpperCase();
    return s === "WAITING" || s === "ADMITTED" || s === "OUTPATIENT";
  }, [selectedQueue]);

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.3}>
          <Typography variant="h5" fontWeight={900}>
            Patient Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a waiting patient • Add prescription • Mark Admit / Outpatient / Cancel
          </Typography>
        </Stack>
        <Chip label="Doctor View" variant="outlined" />
      </Stack>

      {(queuesQuery.isError || prescriptionsQuery.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(queuesQuery.error as any)?.message ?? (prescriptionsQuery.error as any)?.message ?? "Failed to load data."}
        </Alert>
      )}

      {overlayOpen && (
        <Box
          onClick={() => {
            setOverlayOpen(false);
            setSuggestOpen(false);
          }}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.55)",
            zIndex: 1200,
          }}
        />
      )}

      <Grid container spacing={2}>
        <Grid size={{xs:12, md:6}}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={900}>Waiting Queue</Typography>
                <Chip size="small" label={`${waitingQueues.length} item(s)`} />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid size={{xs:12, md:7}}>
                  <Box ref={searchRef}>
                    <TextField
                      label="Search"
                      placeholder="name / triage"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSuggestOpen(true);
                      }}
                      onFocus={() => {
                        setOverlayOpen(true);
                        setSuggestOpen(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setOverlayOpen(false), 100);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setSuggestOpen(false);
                          setOverlayOpen(false);
                        }
                      }}
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSearch("");
                              setSuggestOpen(false);
                              setOverlayOpen(false);
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
                    style={{ zIndex: 1301, width: anchorW }}
                  >
                    <ClickAwayListener
                      onClickAway={() => {
                        setSuggestOpen(false);
                        setOverlayOpen(false);
                      }}
                    >
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
                                  setOverlayOpen(false);
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

                <Grid size={{xs:12, md:5}}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField select label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} fullWidth>
                      <MenuItem value="createdAt">Created</MenuItem>
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

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 540, overflowY: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">View</TableCell>
                    </TableRow>
                  </TableHead>

                  {queuesQuery.isLoading ? (
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5}>Loading…</TableCell>
                      </TableRow>
                    </TableBody>
                  ) : waitingQueues.length === 0 ? (
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ borderBottom: "none" }}>
                          <Stack direction="column" justifyContent="center" alignItems="center" spacing={5} sx={{ py: 10, width: "100%" }}>
                            <Avatar src={emptyBoxAsset} sx={{ width: 150, height: 150 }} />
                            <p style={{ margin: 0, fontWeight: "bold", color: "gray" }}>No queue items</p>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ) : (
                    <TableBody>
                      {sortQueues(waitingQueues, sortKey, sortDir).map((q) => (
                        <TableRow
                          key={q.id}
                          hover
                          selected={q.id === selectedQueueId}
                          sx={{ cursor: "pointer" }}
                          onClick={() => setSelectedQueueId(q.id)}
                        >
                          <TableCell>
                            <Stack spacing={0.2}>
                              <Typography fontWeight={800}>{q.patientName ?? "—"}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Patient: {q.patientId ?? "—"} • Triage: {q.triageLevel ?? "—"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{priorityChip(q.priority)}</TableCell>
                          <TableCell>{statusChip(q.status)}</TableCell>
                          <TableCell>{fmtDT(q.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Select">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQueueId(q.id);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </TableContainer>

              {updateQueue.isError && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {(updateQueue.error as any)?.message ?? "Action failed."}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12, md:6}}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={900}>Selected Patient</Typography>
                {!selectedQueue ? <Chip size="small" variant="outlined" label="No selection" /> : statusChip(selectedQueue.status)}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {!selectedQueue ? (
                <Stack direction="column" justifyContent="center" alignItems="center" spacing={5} sx={{ py: 10, width: "100%" }}>
                  <Avatar src={emptyBoxAsset} sx={{ width: 180, height: 180 }} />
                  <p style={{ margin: 0, fontWeight: "bold", color: "gray" }}>No selected queue item</p>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Grid container spacing={1.5}>
                    <Grid size={{xs:12, md:12}}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography fontWeight={900}>{selectedQueue.patientName ?? "—"}</Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            <b>Patient ID:</b> {selectedQueue.patientId ?? "—"}
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
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{xs:12, md:12}} sx={{ width:"100%"}}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: "wrap" }}>
                            <Typography fontWeight={900}>Prescriptions</Typography>
                            <Chip size="small" label={`${doctorQueuePrescriptions.length} item(s)`} />
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />

                          {!canPrescription ? (
                            <Alert severity="info">Select a patient to view/create prescriptions.</Alert>
                          ) : (
                            <Stack spacing={1.2}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={prescEnabled}
                                    onChange={(e) => setPrescEnabled(e.target.checked)}
                                    disabled={busy}
                                  />
                                }
                                label="Enable Prescription"
                              />

                              <Grid container spacing={1}>
                                <Grid size={{xs:12, md:4}}>
                                  <TextField
                                    select
                                    label="Type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    fullWidth
                                    disabled={busy}
                                  >
                                    <MenuItem value="OPD">OPD</MenuItem>
                                    <MenuItem value="IPD">IPD</MenuItem>
                                  </TextField>
                                </Grid>
                                <Grid size={{xs:12, md:8}}>
                                  <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth disabled={busy} />
                                </Grid>
                              </Grid>

                              <Divider />

                              <Stack spacing={1}>
                                {items.map((it, idx) => (
                                  <Paper key={idx} variant="outlined" sx={{ p: 1 }}>
                                    <Grid container spacing={1}>
                                      <Grid size={{xs:12, md:4}}>
                                        <TextField
                                          label="Medicine"
                                          value={it.medicineName}
                                          onChange={(e) => setItem(idx, "medicineName", e.target.value)}
                                          fullWidth
                                          disabled={busy || !prescEnabled}
                                          error={prescEnabled && itemErrors[idx]?.medicine}
                                          helperText={prescEnabled && itemErrors[idx]?.medicine ? "Required" : " "}
                                        />
                                      </Grid>
                                      <Grid size={{xs:12, md:2}}>
                                        <TextField
                                          label="Dosage"
                                          value={it.dosage}
                                          onChange={(e) => setItem(idx, "dosage", e.target.value)}
                                          fullWidth
                                          disabled={busy || !prescEnabled}
                                          error={prescEnabled && itemErrors[idx]?.dosage}
                                          helperText={prescEnabled && itemErrors[idx]?.dosage ? "Required" : " "}
                                        />
                                      </Grid>
                                      <Grid size={{xs:12, md:2}}>
                                        <TextField
                                          label="Frequency"
                                          value={it.frequency}
                                          onChange={(e) => setItem(idx, "frequency", e.target.value)}
                                          fullWidth
                                          disabled={busy || !prescEnabled}
                                          error={prescEnabled && itemErrors[idx]?.frequency}
                                          helperText={prescEnabled && itemErrors[idx]?.frequency ? "Required" : " "}
                                        />
                                      </Grid>
                                      <Grid size={{xs:12, md:2}}>
                                        <TextField
                                          label="Days"
                                          type="number"
                                          value={it.durationDays}
                                          onChange={(e) => setItem(idx, "durationDays", Number(e.target.value))}
                                          fullWidth
                                          disabled={busy || !prescEnabled}
                                          inputProps={{ min: 1 }}
                                          error={prescEnabled && itemErrors[idx]?.days}
                                          helperText={prescEnabled && itemErrors[idx]?.days ? "Must be > 0" : " "}
                                        />
                                      </Grid>
                                      <Grid size={{xs:12, md:2}}>
                                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ height: "100%" }}>
                                          <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => removeItem(idx)}
                                            disabled={busy || items.length === 1 || !prescEnabled}
                                            fullWidth
                                            sx={{ minHeight: 56 }}
                                          >
                                            Remove
                                          </Button>
                                        </Stack>
                                      </Grid>

                                      <Grid size={{xs:12}}>
                                        <TextField
                                          label="Instructions"
                                          value={it.instructions}
                                          onChange={(e) => setItem(idx, "instructions", e.target.value)}
                                          fullWidth
                                          disabled={busy || !prescEnabled}
                                        />
                                      </Grid>
                                    </Grid>
                                  </Paper>
                                ))}

                                <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap">
                                  <Button startIcon={<AddIcon />} variant="outlined" onClick={addItem} disabled={busy || !prescEnabled}>
                                    Add item
                                  </Button>
                                  <Button
                                    variant="contained"
                                    onClick={createNewPrescription}
                                    disabled={busy || !selectedQueue || !prescEnabled || !formValid}
                                  >
                                    Create Prescription
                                  </Button>
                                </Stack>

                                {createPrescription.isError && (
                                  <Alert severity="error">
                                    {(createPrescription.error as any)?.message ?? "Failed to create prescription."}
                                  </Alert>
                                )}
                              </Stack>

                              <Divider />

                              {prescriptionsQuery.isLoading ? (
                                <Alert severity="info">Loading prescriptions…</Alert>
                              ) : doctorQueuePrescriptions.length === 0 ? (
                                <Alert severity="warning">No prescriptions yet.</Alert>
                              ) : (
                                <Stack spacing={1}>
                                  {doctorQueuePrescriptions.map((p: PrescriptionSummaryRes) => (
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
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => openPrescription(Number(p.id))}
                                          >
                                            View
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<PrintIcon />}
                                            onClick={() => openPrescription(Number(p.id))}
                                          >
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
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{xs:12, md:12}} sx={{ order: { xs: 0, md: 1 } }}>
                      <Card variant="outlined" sx={{ mt: { xs: 0, md: 1.5 } }}>
                        <CardContent>
                          <Typography fontWeight={900} sx={{ mb: 1 }}>
                            Actions
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                            <Button
                              startIcon={<LocalHospitalIcon />}
                              variant="contained"
                              onClick={() => askConfirm("ADMITTED")}
                              disabled={busy}
                              fullWidth
                            >
                              Admit
                            </Button>
                            <Button
                              startIcon={<DoneAllIcon />}
                              variant="outlined"
                              onClick={() => askConfirm("OUTPATIENT")}
                              disabled={busy}
                              fullWidth
                            >
                              Outpatient
                            </Button>
                            <Button
                              startIcon={<CancelIcon />}
                              variant="outlined"
                              color="error"
                              onClick={() => askConfirm("CANCELLED")}
                              disabled={busy}
                              fullWidth
                            >
                              Cancel
                            </Button>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Admit sets <b>admitted=false</b> (nurse confirms later).
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={confirmOpen} onClose={onConfirmNo} fullWidth maxWidth="xs">
        <DialogTitle>{confirmTitle}</DialogTitle>
        <DialogContent dividers>
          <Typography>{confirmBody}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onConfirmNo} variant="outlined">
            No
          </Button>
          <Button onClick={onConfirmYes} variant="contained" disabled={busy}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={prescOpen} onClose={closePrescription} fullWidth maxWidth="md">
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
                  <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={() =>
                      printPrescription(prescDetailQuery.data!, {
                        patientName: selectedQueue?.patientName,
                        patientId: selectedQueue?.patientId,
                        triageLevel: selectedQueue?.triageLevel,
                      })
                    }
                  >
                    Print / Save as PDF
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={1}>
                <Grid size={{xs:12, md:6}}>
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
                <Grid size={{xs:12, md:6}}>
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
                Printing uses browser print dialog. Choose <b>Save as PDF</b>.
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
