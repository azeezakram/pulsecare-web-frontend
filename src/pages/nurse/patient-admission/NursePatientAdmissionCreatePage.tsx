/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ClearIcon from "@mui/icons-material/Clear";
import {
    Alert,
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
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";

// ✅ adjust paths if needed
import { useAllActivePatients } from "../../../features/patient/patient-service";
import type { PatientRes } from "../../../features/patient/types";

import { useAllDepartments } from "../../../features/department/department-service";
import type { DeptRes } from "../../../features/department/types";

import type { WardRes } from "../../../features/ward/types";
import { useWardsByDepartmentId } from "../../../features/ward/ward-service";

import { useBedsByWardId } from "../../../features/bed/bed-service";
import type { BedRes } from "../../../features/bed/types";

import {
    useCheckActiveAdmission,
    useCreatePatientAdmission,
} from "../../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionReq } from "../../../features/patient-admission/types";

// If you use react-router:
import { useNavigate } from "react-router-dom";

/* -----------------------------
 * helpers
 * ------------------------------ */
function safeLower(v?: string) {
    return (v ?? "").trim().toLowerCase();
}

function patientLabel(p: PatientRes) {
    return p.fullName ?? `Patient #${p.id}`;
}
function deptLabel(d: any) {
    return d?.name ?? d?.deptName ?? d?.departmentName ?? `Department #${d?.id ?? "—"}`;
}
function wardLabel(w: any) {
    return w?.name ?? w?.wardName ?? `Ward #${w?.id ?? "—"}`;
}
function bedLabel(b: any) {
    return b?.bedNo ?? b?.name ?? `Bed #${b?.id ?? "—"}`;
}

function matchesPatient(p: PatientRes, term: string) {
    const t = safeLower(term);
    if (!t) return true;
    const name = safeLower(p.fullName ?? "");
    const pid = String(p.id ?? "");
    const nic = safeLower((p as any)?.nic ?? "");
    const phone = safeLower((p as any)?.phone ?? "");
    return name.includes(t) || pid.includes(t) || nic.includes(t) || phone.includes(t);
}

export default function NursePatientAdmissionCreatePage() {
    const navigate = useNavigate();

    // data
    const patientsQuery = useAllActivePatients();
    const deptsQuery = useAllDepartments();

    const createAdmission = useCreatePatientAdmission();
    const checkActiveAdmission = useCheckActiveAdmission();

    // UI state: patient search
    const [patientSearch, setPatientSearch] = useState("");
    const [patientSuggestOpen, setPatientSuggestOpen] = useState(false);
    const patientSearchRef = useRef<HTMLDivElement | null>(null);
    const [patientAnchorEl, setPatientAnchorEl] = useState<HTMLElement | null>(null);
    const [patientAnchorWidth, setPatientAnchorWidth] = useState(0);

    // selection
    const [selectedPatient, setSelectedPatient] = useState<PatientRes | null>(null);

    // validation / active admission check
    const [checkingActive, setCheckingActive] = useState(false);
    const [hasActiveAdmission, setHasActiveAdmission] = useState<boolean>(false);

    // create form
    const [deptId, setDeptId] = useState<number | "">("");
    const [wardId, setWardId] = useState<number | "">("");
    const [bedId, setBedId] = useState<number | "">("");
    const [attempted, setAttempted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);

    const wardsQuery = useWardsByDepartmentId(typeof deptId === "number" ? deptId : undefined);
    const bedsQuery = useBedsByWardId(typeof wardId === "number" ? wardId : undefined);

    const busy =
        patientsQuery.isLoading ||
        deptsQuery.isLoading ||
        wardsQuery.isLoading ||
        bedsQuery.isLoading ||
        createAdmission.isPending ||
        checkingActive;

    // popper sizing
    useEffect(() => {
        const el = patientSearchRef.current;
        if (!el) return;

        setPatientAnchorEl(el);
        const updateWidth = () => setPatientAnchorWidth(el.getBoundingClientRect().width);
        updateWidth();

        const ro = new ResizeObserver(() => updateWidth());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

    const patientSuggestions = useMemo(() => {
        const t = safeLower(patientSearch);
        if (!t) return [];
        return patients.filter((p) => matchesPatient(p, t)).slice(0, 10);
    }, [patients, patientSearch]);

    const clearPatientSelection = () => {
        setSelectedPatient(null);
        setPatientSearch("");
        setHasActiveAdmission(false);
        setDeptId("");
        setWardId("");
        setBedId("");
        setAttempted(false);
        setSubmitError(null);
    };

    const onPickPatient = async (p: PatientRes) => {
        setSelectedPatient(p);
        setPatientSearch(patientLabel(p));
        setPatientSuggestOpen(false);

        // reset dependent form
        setDeptId("");
        setWardId("");
        setBedId("");
        setAttempted(false);
        setSubmitError(null);

        // ✅ validate active admission at selection time
        setCheckingActive(true);
        setHasActiveAdmission(false);
        try {
            const hasActive = await checkActiveAdmission(p.id);
            setHasActiveAdmission(Boolean(hasActive));

        } catch (e: any) {
            setHasActiveAdmission(true);
        } finally {
            setCheckingActive(false);
        }
    };

    const canSubmit =
        !!selectedPatient &&
        !hasActiveAdmission &&
        typeof deptId === "number" &&
        typeof wardId === "number" &&
        typeof bedId === "number" &&
        !busy;

    const submit = async () => {
        setAttempted(true);
        setSubmitError(null);

        if (!selectedPatient) {
            setSubmitError("Please select a patient.");
            return;
        }
        if (hasActiveAdmission) {
            setSubmitError("This patient already has an active admission. You cannot create a new one.");
            return;
        }
        if (typeof deptId !== "number" || typeof wardId !== "number" || typeof bedId !== "number") {
            setSubmitError("Please select Department, Ward, and Bed.");
            return;
        }

        const payload: PatientAdmissionReq = {
            patientId: selectedPatient.id,
            bedId,
            status: "ACTIVE",
            admittedAt: dayjs().toISOString(),
        } as any;

        try {
            await createAdmission.mutateAsync(payload);
            setSuccessOpen(true);
        } catch (e: any) {
            setSubmitError(e?.message ?? "Failed to create admission.");
        }
    };

    return (
        <Box sx={{ py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack spacing={0.3}>
                    <Typography variant="h5" fontWeight={900}>
                        Create Admission (Nurse)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Search patient • validate active admission • choose Dept/Ward/Bed • create
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                        startIcon={<ArrowBackIcon />}
                        variant="outlined"
                        onClick={() => navigate(-1)}
                        disabled={busy}
                    >
                        Back
                    </Button>
                </Stack>
            </Stack>

            {(patientsQuery.isError || deptsQuery.isError) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {(patientsQuery.error as any)?.message ??
                        (deptsQuery.error as any)?.message ??
                        "Failed to load data."}
                </Alert>
            )}

            {busy && <LinearProgress sx={{ mb: 2 }} />}

            {/* Patient Search */}
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontWeight={900}>1) Select Patient</Typography>
                        {selectedPatient && (
                            <Tooltip title="Clear patient">
                                <IconButton onClick={clearPatientSelection} disabled={busy}>
                                    <ClearIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>

                    <Box ref={patientSearchRef}>
                        <TextField
                            label="Search patient"
                            placeholder="Name / ID / NIC / phone"
                            value={patientSearch}
                            onChange={(e) => {
                                setPatientSearch(e.target.value);
                                setPatientSuggestOpen(true);
                                // user typing means they may change selection
                                setSelectedPatient(null);
                                setHasActiveAdmission(false);
                                setDeptId("");
                                setWardId("");
                                setBedId("");
                                setAttempted(false);
                                setSubmitError(null);
                            }}
                            onFocus={() => setPatientSuggestOpen(true)}
                            fullWidth
                            disabled={patientsQuery.isLoading || busy}
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setPatientSearch("");
                                            setPatientSuggestOpen(false);
                                        }}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                ),
                            }}
                        />
                    </Box>

                    <Popper
                        open={patientSuggestOpen && !!patientSearch.trim() && !!patientAnchorEl}
                        anchorEl={patientAnchorEl}
                        placement="bottom-start"
                        style={{ zIndex: 1300, width: patientAnchorWidth }}
                    >
                        <ClickAwayListener onClickAway={() => setPatientSuggestOpen(false)}>
                            <Paper variant="elevation" sx={{ mt: 1, maxHeight: 320, overflowY: "auto" }}>
                                {patientsQuery.isLoading ? (
                                    <Box sx={{ p: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Loading patients…
                                        </Typography>
                                    </Box>
                                ) : patientSuggestions.length === 0 ? (
                                    <Box sx={{ p: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No matches
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack divider={<Divider />} sx={{ p: 0.5 }}>
                                        {patientSuggestions.map((p) => (
                                            <Box
                                                key={p.id}
                                                sx={{ p: 1, cursor: "pointer" }}
                                                onClick={() => onPickPatient(p)}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography fontWeight={900}>{patientLabel(p)}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        ID: {p.id}
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="body2" color="text.secondary">
                                                    {(p as any)?.nic ? `NIC: ${(p as any).nic} • ` : ""}
                                                    {(p as any)?.phone ? `Phone: ${(p as any).phone}` : ""}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </ClickAwayListener>
                    </Popper>

                    {!selectedPatient ? (
                        <Alert severity="info" sx={{ mt: 1.5 }}>
                            Select a patient to continue. The admission form will appear below.
                        </Alert>
                    ) : (
                        <Alert severity={hasActiveAdmission ? "warning" : "success"} sx={{ mt: 1.5 }}>
                            <b>Selected:</b> {patientLabel(selectedPatient)} (ID: {selectedPatient.id})
                            {checkingActive ? " • Checking active admission…" : ""}
                            {!checkingActive && hasActiveAdmission
                                ? " • This patient already has an active admission."
                                : !checkingActive
                                    ? " • No active admission."
                                    : ""}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Create form section (empty until patient selected) */}
            {!selectedPatient ? (
                <Card variant="outlined">
                    <CardContent>
                        <Typography fontWeight={900}>2) Admission Details</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography color="text.secondary">
                            Please select a patient first.
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Card variant="outlined">
                    <CardContent>
                        <Typography fontWeight={900}>2) Admission Details</Typography>
                        <Divider sx={{ my: 1.5 }} />

                        {submitError && (
                            <Alert severity="error" sx={{ mb: 1.5 }}>
                                {submitError}
                            </Alert>
                        )}

                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    select
                                    label="Department"
                                    fullWidth
                                    value={deptId}
                                    onChange={(e) => {
                                        const v = e.target.value === "" ? "" : Number(e.target.value);
                                        setDeptId(v as any);
                                        setWardId("");
                                        setBedId("");
                                        setSubmitError(null);
                                    }}
                                    disabled={busy || hasActiveAdmission || deptsQuery.isLoading}
                                    error={attempted && typeof deptId !== "number"}
                                    helperText={attempted && typeof deptId !== "number" ? "Required" : " "}
                                >
                                    <MenuItem value="">Select department</MenuItem>
                                    {(deptsQuery.data ?? []).map((d: DeptRes | any) => (
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
                                    value={wardId}
                                    onChange={(e) => {
                                        const v = e.target.value === "" ? "" : Number(e.target.value);
                                        setWardId(v as any);
                                        setBedId("");
                                        setSubmitError(null);
                                    }}
                                    disabled={busy || hasActiveAdmission || typeof deptId !== "number" || wardsQuery.isLoading}
                                    error={attempted && typeof wardId !== "number"}
                                    helperText={
                                        attempted && typeof wardId !== "number"
                                            ? "Required"
                                            : typeof deptId !== "number"
                                                ? "Select department first"
                                                : " "
                                    }
                                >
                                    <MenuItem value="">Select ward</MenuItem>
                                    {(wardsQuery.data ?? []).map((w: WardRes | any) => (
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
                                    value={bedId}
                                    onChange={(e) => {
                                        const v = e.target.value === "" ? "" : Number(e.target.value);
                                        setBedId(v as any);
                                        setSubmitError(null);
                                    }}
                                    disabled={busy || hasActiveAdmission || typeof wardId !== "number" || bedsQuery.isLoading}
                                    error={attempted && typeof bedId !== "number"}
                                    helperText={
                                        attempted && typeof bedId !== "number"
                                            ? "Required"
                                            : typeof wardId !== "number"
                                                ? "Select ward first"
                                                : " "
                                    }
                                >
                                    <MenuItem value="">Select bed</MenuItem>
                                    {(bedsQuery.data ?? []).map((b: BedRes | any) => (
                                        <MenuItem key={b.id} value={b.id} disabled={Boolean((b as any).isTaken)}>
                                            {bedLabel(b)} {(b as any).isTaken ? " (Taken)" : " (Free)"}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                            <Button variant="outlined" onClick={clearPatientSelection} disabled={busy}>
                                Clear
                            </Button>
                            <Button
                                startIcon={<AddIcon />}
                                variant="contained"
                                onClick={submit}
                                disabled={!canSubmit}
                            >
                                Create Admission
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* success dialog */}
            <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Admission Created</DialogTitle>
                <DialogContent dividers>
                    <Alert severity="success">
                        Admission created successfully.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setSuccessOpen(false);
                            navigate(-1);
                        }}
                        variant="contained"
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}