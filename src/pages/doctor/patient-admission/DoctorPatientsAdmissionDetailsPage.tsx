/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";

import { useAuthStore } from "../../../store/auth-store";

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
    useUpdatePatientAdmission,
} from "../../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionReq, PatientAdmissionRes } from "../../../features/patient-admission/types";

import {
    useCreatePrescription,
    usePrescriptionDetailById,
    usePrescriptionsByAdmissionId,
} from "../../../features/prescription/prescription-service";
import type { PrescriptionDetailRes, PrescriptionReq, PrescriptionType } from "../../../features/prescription/types";

function fmtDT(v?: string | null) {
    if (!v) return "—";
    const d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}

function statusChip(s?: string) {
    const v = String(s ?? "").toUpperCase();
    if (v === "ACTIVE") return <Chip size="small" color="warning" label="ACTIVE" />;
    if (v === "DISCHARGED") return <Chip size="small" color="success" label="DISCHARGED" />;
    if (v === "TRANSFERRED") return <Chip size="small" color="info" label="TRANSFERRED" />;
    return <Chip size="small" variant="outlined" label={v || "—"} />;
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

// ------- printing helper (reuse your old one) -------
function esc(s?: string) {
    return (s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function printPrescription(detail: PrescriptionDetailRes, meta: { patientName?: string; patientId?: number | string }) {
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
      </div>
      <div>
        <div><b>Doctor:</b> ${esc(detail.doctorName ?? "—")}</div>
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
            : items.map(
                (it) => `<tr>
                <td>${esc(it.medicineName ?? "—")}</td>
                <td>${esc(it.dosage ?? "—")}</td>
                <td>${esc(it.frequency ?? "—")}</td>
                <td>${esc(String(it.durationDays ?? "—"))}</td>
                <td>${esc(it.instructions ?? "—")}</td>
              </tr>`
            ).join("")
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
    setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 250);
}


type TabKey = "ADD" | "HISTORY";

export default function DoctorAdmissionDetailsPage() {
    const nav = useNavigate();
    const { id } = useParams();
    const admissionId = Number(id);

    const doctorId = useAuthStore((s) => s.currentUser?.id);

    const patientsQuery = useAllActivePatients();
    const admissionsQuery = useAllPatientAdmissions();
    const bedsAllQuery = useAllBeds();
    const wardsAllQuery = useAllWards();
    const deptsQuery = useAllDepartments();

    const updateAdmission = useUpdatePatientAdmission();

    const admission = useMemo(() => {
        const list = admissionsQuery.data ?? [];
        return list.find((a) => Number(a.id) === admissionId) ?? null;
    }, [admissionsQuery.data, admissionId]);

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

    const busy =
        patientsQuery.isLoading ||
        admissionsQuery.isLoading ||
        bedsAllQuery.isLoading ||
        wardsAllQuery.isLoading ||
        deptsQuery.isLoading ||
        updateAdmission.isPending;

    // ----- prescriptions -----
    const prescriptionsQuery = usePrescriptionsByAdmissionId(admissionId);
    const prescriptions = prescriptionsQuery.data ?? [];

    const createPrescription = useCreatePrescription();

    const [tab, setTab] = useState<TabKey>("ADD");

    // Add-prescription form state
    const [prescEnabled, setPrescEnabled] = useState(false);
    const [type, setType] = useState<PrescriptionType>("IPD");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<Array<{ medicineName: string; dosage: string; frequency: string; durationDays: number; instructions: string }>>(
        [{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]
    );

    useEffect(() => {
        const set = () => {
            setPrescEnabled(false);
            setNotes("");
            setItems([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
            setType("IPD");
        }
        set()

    }, [admissionId]);

    const itemErrors = useMemo(() => {
        return items.map((it) => ({
            medicine: !it.medicineName?.trim(),
            dosage: !it.dosage?.trim(),
            frequency: !it.frequency?.trim(),
            days: !(Number(it.durationDays) > 0),
        }));
    }, [items]);

    const formValid = useMemo(() => itemErrors.every((e) => !e.medicine && !e.dosage && !e.frequency && !e.days), [itemErrors]);

    const addItem = () => setItems((p) => [...p, { medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
    const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
    const setItem = (idx: number, key: keyof (typeof items)[number], val: any) =>
        setItems((p) => p.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

    const createNewPrescription = async () => {
        if (!admission) return;
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
            admissionId: admission.id,
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

        await createPrescription.mutateAsync(payload as any);

        // refresh list + reset form
        await prescriptionsQuery.refetch();
        setNotes("");
        setItems([{ medicineName: "", dosage: "", frequency: "", durationDays: 1, instructions: "" }]);
        setPrescEnabled(false);
        setTab("HISTORY");
    };

    // ----- view / print -----
    const [detailOpen, setDetailOpen] = useState(false);
    const [prescId, setPrescId] = useState<number | undefined>(undefined);
    const prescDetailQuery = usePrescriptionDetailById(prescId);

    const openPrescription = (pid: number) => { setPrescId(pid); setDetailOpen(true); };
    const closePrescription = () => { setDetailOpen(false); setPrescId(undefined); };

    // ----- discharge -----
    const [dischargeOpen, setDischargeOpen] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState("");

    const canDischarge = useMemo(() => {
        const st = String(admission?.status ?? "").toUpperCase();
        return !!admission && st === "ACTIVE";
    }, [admission]);

    const submitDischarge = async () => {
        if (!admission) return;

        const payload: PatientAdmissionReq = {
            patientId: admission.patientId,
            bedId: admission.bedId,
            queueId: (admission as any).queueId,
            status: "DISCHARGED",
            dischargeNotes: dischargeNotes?.trim() || undefined,
            admittedAt: admission.admittedAt,
            // IMPORTANT: doctor DOES NOT set dischargedAt
            dischargedAt: null,
        } as any;

        await updateAdmission.mutateAsync({ id: admission.id, payload } as any);
        await admissionsQuery.refetch();
        setDischargeOpen(false);
    };

    const patient = useMemo(() => {
        if (!admission) return null;
        return patientById.get(Number(admission.patientId ?? 0)) ?? null;
    }, [admission, patientById]);

    if (!Number.isFinite(admissionId) || admissionId <= 0) {
        return (
            <Box sx={{ py: 2 }}>
                <Alert severity="error">Invalid admission id</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Back">
                        <IconButton onClick={() => nav(-1)}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>

                    <Stack spacing={0.2}>
                        <Typography variant="h5" fontWeight={900}>Admission Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Admission #{admissionId}
                        </Typography>
                    </Stack>
                </Stack>

                {admission ? statusChip(admission.status as any) : <Chip size="small" variant="outlined" label="Loading" />}
            </Stack>

            {(patientsQuery.isError || admissionsQuery.isError || bedsAllQuery.isError || wardsAllQuery.isError || deptsQuery.isError) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {(patientsQuery.error as any)?.message ??
                        (admissionsQuery.error as any)?.message ??
                        (bedsAllQuery.error as any)?.message ??
                        (wardsAllQuery.error as any)?.message ??
                        (deptsQuery.error as any)?.message ??
                        "Failed to load data."}
                </Alert>
            )}

            {busy && <LinearProgress sx={{ mb: 2 }} />}

            {!admission ? (
                <Alert severity="info">Loading admission…</Alert>
            ) : (
                <Grid container spacing={2}>
                    {/* Left: admission info */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                                    <Typography fontWeight={900}>Admission Info</Typography>
                                    {statusChip(admission.status as any)}
                                </Stack>

                                <Divider sx={{ my: 1.5 }} />

                                <Stack spacing={0.8}>
                                    <Typography variant="body2"><b>Patient:</b> {patient?.fullName ?? "—"}</Typography>
                                    <Typography variant="body2"><b>Patient ID:</b> {admission.patientId ?? "—"}</Typography>
                                    <Typography variant="body2"><b>Department:</b> {toDeptName(admission, bedById, wardById, deptById)}</Typography>
                                    <Typography variant="body2"><b>Ward:</b> {toWardName(admission, bedById, wardById)}</Typography>
                                    <Typography variant="body2"><b>Bed:</b> {toBedNo(admission, bedById)}</Typography>

                                    <Divider sx={{ my: 1 }} />

                                    <Typography variant="body2"><b>Admitted:</b> {fmtDT(admission.admittedAt)}</Typography>
                                    <Typography variant="body2"><b>Discharged:</b> {fmtDT(admission.dischargedAt)}</Typography>

                                    {(admission as any)?.dischargeNotes && (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            <b>Discharge Notes:</b> {String((admission as any).dischargeNotes).slice(0, 500)}
                                        </Alert>
                                    )}
                                </Stack>

                                <Divider sx={{ my: 1.5 }} />

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        disabled={busy || !canDischarge}
                                        onClick={() => { setDischargeNotes(String((admission as any)?.dischargeNotes ?? "")); setDischargeOpen(true); }}
                                        fullWidth
                                    >
                                        Discharge
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        onClick={() => { prescriptionsQuery.refetch(); admissionsQuery.refetch(); }}
                                        disabled={busy}
                                        fullWidth
                                    >
                                        Refresh
                                    </Button>
                                </Stack>

                                {!canDischarge && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Discharge is only available when status is <b>ACTIVE</b>.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Right: tabs */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
                                    <Tab value="ADD" label="Add Prescription" />
                                    <Tab value="HISTORY" label="Prescription History" />
                                </Tabs>

                                <Divider sx={{ mb: 2 }} />

                                {tab === "ADD" ? (
                                    <Stack spacing={1.2}>
                                        <Alert severity="info">
                                            Prescription will be linked to this admission (Admission ID: <b>{admission.id}</b>)
                                        </Alert>

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={prescEnabled}
                                                    onChange={(e) => setPrescEnabled(e.target.checked)}
                                                    disabled={busy || String(admission.status ?? "").toUpperCase() !== "ACTIVE"}
                                                />
                                            }
                                            label="Enable Prescription"
                                        />

                                        {String(admission.status ?? "").toUpperCase() !== "ACTIVE" && (
                                            <Alert severity="warning">Cannot add prescription when admission is not ACTIVE.</Alert>
                                        )}

                                        <Grid container spacing={1}>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField
                                                    select
                                                    label="Type"
                                                    value={type}
                                                    onChange={(e) => setType(e.target.value as any)}
                                                    fullWidth
                                                    disabled={busy || !prescEnabled}
                                                >
                                                    <MenuItem value="IPD">IPD</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 8 }}>
                                                <TextField
                                                    label="Notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    fullWidth
                                                    disabled={busy || !prescEnabled}
                                                />
                                            </Grid>
                                        </Grid>

                                        <Divider />

                                        <Stack spacing={1}>
                                            {items.map((it, idx) => (
                                                <Paper key={idx} variant="outlined" sx={{ p: 1 }}>
                                                    <Grid container spacing={1}>
                                                        <Grid size={{ xs: 12, md: 4 }}>
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

                                                        <Grid size={{ xs: 12, md: 2 }}>
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

                                                        <Grid size={{ xs: 12, md: 2 }}>
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

                                                        <Grid size={{ xs: 12, md: 2 }}>
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

                                                        <Grid size={{ xs: 12, md: 2 }}>
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
                                                        </Grid>

                                                        <Grid size={{ xs: 12 }}>
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
                                                    disabled={busy || !prescEnabled || !formValid}
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
                                    </Stack>
                                ) : (
                                    <Stack spacing={1}>
                                        {prescriptionsQuery.isLoading ? (
                                            <LinearProgress />
                                        ) : prescriptionsQuery.isError ? (
                                            <Alert severity="error">
                                                {(prescriptionsQuery.error as any)?.message ?? "Failed to load prescriptions."}
                                            </Alert>
                                        ) : prescriptions.length === 0 ? (
                                            <Alert severity="info">No prescriptions for this admission yet.</Alert>
                                        ) : (
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    {prescriptions.length} prescription(s)
                                                </Typography>

                                                {prescriptions
                                                    .slice()
                                                    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
                                                    .map((p) => (
                                                        <Paper key={p.id} variant="outlined" sx={{ p: 1 }}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                                                                <Stack spacing={0.2}>
                                                                    <Typography fontWeight={900}>Prescription #{p.id}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Doctor: {p.doctorName ?? "—"} • {fmtDT(p.createdAt)}
                                                                    </Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Items: {(p.items ?? []).length} • Type: {(p.type ?? "—").toUpperCase()} • Status: {(p.status ?? "—").toUpperCase()}
                                                                    </Typography>
                                                                </Stack>

                                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                                    <Button size="small" variant="outlined" onClick={() => openPrescription(Number(p.id))}>
                                                                        View
                                                                    </Button>
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        startIcon={<PrintIcon />}
                                                                        onClick={async () => {
                                                                            printPrescription(p as any, { patientName: patient?.fullName, patientId: admission.patientId });
                                                                        }}
                                                                    >
                                                                        Print
                                                                    </Button>
                                                                </Stack>
                                                            </Stack>

                                                            {/* quick items preview */}
                                                            {(p.items ?? []).length > 0 && (
                                                                <>
                                                                    <Divider sx={{ my: 1 }} />
                                                                    <TableContainer component={Paper} variant="outlined">
                                                                        <Table size="small">
                                                                            <TableHead>
                                                                                <TableRow>
                                                                                    <TableCell>Medicine</TableCell>
                                                                                    <TableCell>Dosage</TableCell>
                                                                                    <TableCell>Frequency</TableCell>
                                                                                    <TableCell>Days</TableCell>
                                                                                </TableRow>
                                                                            </TableHead>
                                                                            <TableBody>
                                                                                {(p.items ?? []).slice(0, 5).map((it) => (
                                                                                    <TableRow key={it.id}>
                                                                                        <TableCell>{it.medicineName ?? "—"}</TableCell>
                                                                                        <TableCell>{it.dosage ?? "—"}</TableCell>
                                                                                        <TableCell>{it.frequency ?? "—"}</TableCell>
                                                                                        <TableCell>{typeof it.durationDays === "number" ? it.durationDays : "—"}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </TableContainer>
                                                                    {(p.items ?? []).length > 5 && (
                                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                                                                            Showing first 5 items…
                                                                        </Typography>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Paper>
                                                    ))}
                                            </>
                                        )}
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Discharge dialog */}
            <Dialog open={dischargeOpen} onClose={() => setDischargeOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Discharge Patient</DialogTitle>
                <DialogContent dividers>
                    {!admission ? (
                        <Alert severity="info">No admission selected</Alert>
                    ) : (
                        <Stack spacing={1.2}>
                            <Alert severity="warning">
                                This will set status to <b>DISCHARGED</b>. Nurse will confirm and set the discharged date/time later.
                            </Alert>

                            <TextField
                                label="Discharge Notes"
                                value={dischargeNotes}
                                onChange={(e) => setDischargeNotes(e.target.value)}
                                fullWidth
                                multiline
                                minRows={3}
                                placeholder="Doctor discharge notes..."
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDischargeOpen(false)} variant="outlined" disabled={busy}>Cancel</Button>
                    <Button onClick={submitDischarge} variant="contained" color="error" disabled={busy || !canDischarge}>
                        Confirm Discharge
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Prescription detail dialog (optional) */}
            <Dialog open={detailOpen} onClose={closePrescription} fullWidth maxWidth="md">
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
                                    <Chip size="small" variant="outlined" label={(prescDetailQuery.data.status ?? "—").toUpperCase()} />
                                    <Button
                                        variant="contained"
                                        startIcon={<PrintIcon />}
                                        onClick={() => printPrescription(prescDetailQuery.data!, { patientName: patient?.fullName, patientId: admission?.patientId })}
                                    >
                                        Print / Save as PDF
                                    </Button>
                                </Stack>
                            </Stack>

                            <Divider />

                            <Grid container spacing={1}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="body2"><b>Doctor:</b> {prescDetailQuery.data.doctorName ?? "—"}</Typography>
                                    <Typography variant="body2"><b>Admission ID:</b> {prescDetailQuery.data.admissionId ?? "—"}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="body2"><b>Created:</b> {fmtDT(prescDetailQuery.data.createdAt)}</Typography>
                                    <Typography variant="body2"><b>Updated:</b> {fmtDT(prescDetailQuery.data.updatedAt)}</Typography>
                                </Grid>
                            </Grid>

                            {prescDetailQuery.data.notes && (
                                <Alert severity="info" sx={{ py: 0.6 }}>
                                    <b>Notes:</b> {prescDetailQuery.data.notes}
                                </Alert>
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
                                            <TableRow><TableCell colSpan={5}>No items</TableCell></TableRow>
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
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePrescription} variant="outlined">Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}