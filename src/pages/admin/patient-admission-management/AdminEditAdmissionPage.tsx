/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert as Alert2,
  Box as Box2,
  Button as Button2,
  Card as Card2,
  CardContent as CardContent2,
  Dialog as Dialog2,
  DialogActions as DialogActions2,
  DialogContent as DialogContent2,
  DialogTitle as DialogTitle2,
  Divider as Divider2,
  Grid as Grid2,
  IconButton as IconButton2,
  LinearProgress as LinearProgress2,
  MenuItem as MenuItem2,
  Paper as Paper2,
  Stack as Stack2,
  Table as Table2,
  TableBody as TableBody2,
  TableCell as TableCell2,
  TableContainer as TableContainer2,
  TableHead as TableHead2,
  TableRow as TableRow2,
  TextField as TextField2,
  Typography as Typography2,
  Tooltip as Tooltip2,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { usePatientAdmissionById, useUpdatePatientAdmission } from "../../../features/patient-admission/patientAdmission-service";
import { useAllBeds } from "../../../features/bed/bed-service";
import { useAllWards } from "../../../features/ward/ward-service";
import { useAllDepartments } from "../../../features/department/department-service";

// ✅ prescriptions (edit page)
import {
  usePrescriptionsByAdmissionId,
  useDeletePrescription,
  useUpdatePrescription,
} from "../../../features/prescription/prescription-service";

type RxItemForm = {
  id?: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number | "";
  instructions: string;
};

type RxEditForm = {
  id: number; // required for edit
  admissionId: number;
  type: "IPD";
  doctorName: string; // display only (top of dialog)
  notes: string;      // editable
  items: RxItemForm[]; // editable
};

const emptyItem = (): RxItemForm => ({
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  instructions: "",
});

function normalizeType(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export function AdminEditAdmissionPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const admissionId = Number(id);

  const admissionQuery = usePatientAdmissionById(admissionId);
  const updateAdmission = useUpdatePatientAdmission();

  const bedsQuery = useAllBeds();
  const wardsQuery = useAllWards();
  const deptsQuery = useAllDepartments();

  const prescriptionsQuery2 = usePrescriptionsByAdmissionId(admissionId);
  const deletePrescription2 = useDeletePrescription();

  // ✅ only update (no create)
  const updatePrescription = useUpdatePrescription();

  const busy =
    admissionQuery.isLoading ||
    bedsQuery.isLoading ||
    wardsQuery.isLoading ||
    deptsQuery.isLoading ||
    prescriptionsQuery2.isLoading ||
    updateAdmission.isPending ||
    deletePrescription2.isPending ||
    updatePrescription.isPending;

  const admission = admissionQuery.data;

  const beds = bedsQuery.data ?? [];
  const wards = wardsQuery.data ?? [];
  const depts = deptsQuery.data ?? [];

  const bedById = useMemo(() => new Map(beds.map((b: any) => [Number(b.id), b])), [beds]);
  const wardById = useMemo(() => new Map(wards.map((w: any) => [Number(w.id), w])), [wards]);

  const currentBed = admission?.bedId ? bedById.get(Number(admission.bedId)) : undefined;
  const currentWard = (currentBed as any)?.wardId ? wardById.get(Number((currentBed as any).wardId)) : undefined;
  const currentDeptId = (currentWard as any)?.departmentId ? Number((currentWard as any).departmentId) : "";

  const isActive = String(admission?.status ?? "").toUpperCase() === "ACTIVE";

  const [deptId, setDeptId] = useState<number | "">("");
  const [wardId, setWardId] = useState<number | "">("");
  const [bedId, setBedId] = useState<number | "">("");

  const [discharge, setDischarge] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState("");

  // ---------------------------
  // Prescription edit dialog state
  // ---------------------------
  const [rxEditOpen, setRxEditOpen] = useState(false);
  const [rxForm, setRxForm] = useState<RxEditForm | null>(null);
  const [rxError, setRxError] = useState<string>("");

  const allRx = useMemo(() => prescriptionsQuery2.data ?? [], [prescriptionsQuery2.data]);

  // ✅ show only IPD
  const ipdRx = useMemo(
    () => allRx.filter((r: any) => normalizeType(r.type) === "IPD"),
    [allRx]
  );

  useEffect(() => {
    if (!admission) return;
    function set() {
      setDeptId(currentDeptId as any);
      setWardId((currentWard as any)?.id ? Number((currentWard as any).id) : "");
      setBedId(admission?.bedId ? Number(admission.bedId) : "");
      setDischarge(false);
      setDischargeNotes("");
    }
    set()
  }, [admission, currentDeptId, currentWard]);

  const wardsForDept = useMemo(() => {
    if (!deptId) return [];
    return wards.filter((w: any) => Number(w.departmentId) === Number(deptId));
  }, [wards, deptId]);

  const bedsForWard = useMemo(() => {
    if (!wardId) return [];
    return beds.filter((b: any) => Number(b.wardId) === Number(wardId));
  }, [beds, wardId]);

  const availableBeds = useMemo(() => {
    return bedsForWard.filter((b: any) => {
      const taken = Boolean(b.isTaken);
      const isCurrent = admission?.bedId && Number(b.id) === Number(admission.bedId);
      return !taken || isCurrent;
    });
  }, [bedsForWard, admission?.bedId]);

  const submit = async () => {
    if (!admission) return;
    if (!isActive) return;

    const payload: any = {
      patientId: admission.patientId,
      queueId: (admission as any).queueId,
      bedId: bedId === "" ? null : Number(bedId),
      status: discharge ? "DISCHARGED" : "ACTIVE",
      dischargeNotes: discharge ? (dischargeNotes.trim() || undefined) : undefined,
      dischargedAt: discharge ? dayjs().toISOString() : null,
    };

    await updateAdmission.mutateAsync({ id: Number(admission.id), payload });
    nav(`/dashboard/admin/patient-addmissions`);
  };

  // ---------------------------
  // Rx edit helpers
  // ---------------------------
  const openEditRx = (rx: any) => {
    setRxError("");
    setRxForm({
      id: Number(rx.id),
      admissionId,
      type: "IPD",
      doctorName: String(rx.doctorName ?? "—"),
      notes: String(rx.notes ?? ""),
      items: (rx.items ?? []).length
        ? (rx.items ?? []).map((it: any) => ({
          id: it.id ? Number(it.id) : undefined,
          medicineName: String(it.medicineName ?? ""),
          dosage: String(it.dosage ?? ""),
          frequency: String(it.frequency ?? ""),
          durationDays: it.durationDays ?? "",
          instructions: String(it.instructions ?? ""),
        }))
        : [emptyItem()],
    });
    setRxEditOpen(true);
  };

  const validateRx = (f: RxEditForm) => {
    if (!f.items.length) return "At least one medicine item is required";
    const bad = f.items.findIndex((x) => !x.medicineName.trim());
    if (bad >= 0) return `Medicine name is required (row ${bad + 1})`;
    return "";
  };

  const saveEditRx = async () => {
    setRxError("");
    if (!rxForm) return;

    const msg = validateRx(rxForm);
    if (msg) return setRxError(msg);

    // ✅ doctorName + status are NOT editable here, so we don’t send them (unless your backend requires doctorName).
    // If your backend requires them, uncomment doctorName line.
    const payload: any = {
      admissionId: rxForm.admissionId,
      type: "IPD",
      // doctorName: rxForm.doctorName, // uncomment ONLY if backend requires it
      notes: rxForm.notes.trim() || undefined,
      items: rxForm.items.map((it) => ({
        id: it.id,
        medicineName: it.medicineName.trim(),
        dosage: it.dosage.trim() || undefined,
        frequency: it.frequency.trim() || undefined,
        durationDays: it.durationDays === "" ? undefined : Number(it.durationDays),
        instructions: it.instructions.trim() || undefined,
      })),
    };

    await updatePrescription.mutateAsync({ id: Number(rxForm.id), payload });
    await prescriptionsQuery2.refetch();
    setRxEditOpen(false);
  };

  const removeItemRow = (idx: number) => {
    setRxForm((p) => {
      if (!p) return p;
      const next = [...p.items];
      next.splice(idx, 1);
      return { ...p, items: next.length ? next : [emptyItem()] };
    });
  };

  const addItemRow = () => {
    setRxForm((p) => (p ? { ...p, items: [...p.items, emptyItem()] } : p));
  };

  if (busy) return <LinearProgress2 />;

  if (admissionQuery.isError) {
    return <Alert2 severity="error">{(admissionQuery.error as any)?.message ?? "Failed to load admission"}</Alert2>;
  }

  return (
    <Box2 sx={{ py: 2 }}>
      <Stack2 spacing={1.2} sx={{ mb: 2 }}>
        <Typography2 variant="h5" fontWeight={900}>Edit Admission</Typography2>
        <Typography2 variant="body2" color="text.secondary">Only ACTIVE admissions can be edited.</Typography2>
      </Stack2>

      {!isActive && (
        <Alert2 severity="warning" sx={{ mb: 2 }}>
          This admission is not ACTIVE, so it cannot be edited.
        </Alert2>
      )}

      <Card2 variant="outlined" sx={{ mb: 2 }}>
        <CardContent2>
          <Typography2 fontWeight={900}>Placement</Typography2>
          <Divider2 sx={{ my: 1.5 }} />

          <Grid2 container spacing={1.2}>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField2
                select
                label="Department"
                value={deptId}
                onChange={(e) => {
                  const v = e.target.value === "" ? "" : Number(e.target.value);
                  setDeptId(v as any);
                  setWardId("");
                  setBedId("");
                }}
                fullWidth
                disabled={!isActive || updateAdmission.isPending}
              >
                <MenuItem2 value="">Select department</MenuItem2>
                {depts.map((d: any) => (
                  <MenuItem2 key={d.id} value={d.id}>{d.name}</MenuItem2>
                ))}
              </TextField2>
            </Grid2>

            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField2
                select
                label="Ward"
                value={wardId}
                onChange={(e) => {
                  const v = e.target.value === "" ? "" : Number(e.target.value);
                  setWardId(v as any);
                  setBedId("");
                }}
                fullWidth
                disabled={!isActive || !deptId || updateAdmission.isPending}
              >
                <MenuItem2 value="">Select ward</MenuItem2>
                {wardsForDept.map((w: any) => (
                  <MenuItem2 key={w.id} value={w.id}>{w.name}</MenuItem2>
                ))}
              </TextField2>
            </Grid2>

            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField2
                select
                label="Bed"
                value={bedId}
                onChange={(e) => setBedId(e.target.value === "" ? "" : Number(e.target.value))}
                fullWidth
                disabled={!isActive || !wardId || updateAdmission.isPending}
              >
                <MenuItem2 value="">Select bed</MenuItem2>
                {availableBeds.map((b: any) => {
                  const isCurrent = Number(b.id) === Number(admission?.bedId);
                  const statusLabel = isCurrent ? "(Current)" : b.isTaken ? "(Taken)" : "(Free)";

                  return (
                    <MenuItem2 key={b.id} value={b.id} disabled={b.isTaken && !isCurrent}>
                      {b.bedNo ?? `Bed #${b.id}`} {statusLabel}
                    </MenuItem2>
                  );
                })}
              </TextField2>
            </Grid2>
          </Grid2>

          <Divider2 sx={{ my: 2 }} />

          <Typography2 fontWeight={900}>Discharge</Typography2>

          <Grid2 container spacing={1.2} sx={{ mt: 0.5 }}>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField2
                select
                label="Status"
                value={discharge ? "DISCHARGED" : "ACTIVE"}
                onChange={(e) => setDischarge(e.target.value === "DISCHARGED")}
                fullWidth
                disabled={!isActive || updateAdmission.isPending}
              >
                <MenuItem2 value="ACTIVE">ACTIVE</MenuItem2>
                <MenuItem2 value="DISCHARGED">DISCHARGED</MenuItem2>
              </TextField2>
            </Grid2>

            <Grid2 size={{ xs: 12, md: 8 }}>
              <TextField2
                label="Discharge Notes"
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                fullWidth
                disabled={!isActive || !discharge || updateAdmission.isPending}
                multiline
                minRows={3}
                placeholder="Enabled only when status = DISCHARGED"
              />
            </Grid2>
          </Grid2>

          {updateAdmission.isError && (
            <Alert2 severity="error" sx={{ mt: 2 }}>
              {(updateAdmission.error as any)?.message ?? "Failed to update admission"}
            </Alert2>
          )}

          <Stack2 direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <Button2 variant="outlined" onClick={() => nav(-1)}>Cancel</Button2>
            <Button2
              variant="contained"
              onClick={submit}
              disabled={!isActive || !bedId || (discharge && !dischargeNotes.trim())}
            >
              Save
            </Button2>
          </Stack2>
        </CardContent2>
      </Card2>

      {/* ======================= PRESCRIPTIONS (ONLY IPD) ======================= */}
      <Card2 variant="outlined">
        <CardContent2>
          <Stack2 direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Typography2 fontWeight={900}>Prescriptions (IPD only)</Typography2>
            <Button2 size="small" variant="outlined" onClick={() => prescriptionsQuery2.refetch()}>
              Refresh
            </Button2>
          </Stack2>

          <Divider2 sx={{ my: 1.5 }} />

          {prescriptionsQuery2.isError ? (
            <Alert2 severity="error">{(prescriptionsQuery2.error as any)?.message ?? "Failed to load prescriptions"}</Alert2>
          ) : ipdRx.length === 0 ? (
            <Alert2 severity="info">No IPD prescriptions for this admission</Alert2>
          ) : (
            <Stack2 spacing={1.2}>
              {ipdRx.map((rx: any) => (
                <Paper2 key={rx.id} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Stack2 direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                    <Stack2 spacing={0.2}>
                      <Typography2 fontWeight={800}>Prescription #{rx.id}</Typography2>
                      <Typography2 variant="body2" color="text.secondary">
                        Doctor: {rx.doctorName ?? "—"} • Type: {rx.type ?? "—"} • Status: {rx.status ?? "—"}
                      </Typography2>
                      {rx.notes ? (
                        <Typography2 variant="body2">
                          <b>Notes:</b> {String(rx.notes).slice(0, 250)}
                        </Typography2>
                      ) : null}
                    </Stack2>

                    <Stack2 direction="row" spacing={1}>
                      <Button2
                        size="small"
                        variant="outlined"
                        onClick={() => openEditRx(rx)}
                        disabled={!isActive}
                        startIcon={<EditIcon />}
                      >
                        Edit
                      </Button2>

                      <Button2
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={deletePrescription2.isPending}
                        onClick={async () => {
                          await deletePrescription2.mutateAsync(Number(rx.id));
                          await prescriptionsQuery2.refetch();
                        }}
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button2>
                    </Stack2>
                  </Stack2>

                  <Divider2 sx={{ my: 1 }} />

                  <TableContainer2 component={Paper2} variant="outlined" sx={{ maxHeight: 280 }}>
                    <Table2 size="small" stickyHeader>
                      <TableHead2>
                        <TableRow2>
                          <TableCell2>Medicine</TableCell2>
                          <TableCell2>Dosage</TableCell2>
                          <TableCell2>Frequency</TableCell2>
                          <TableCell2>Duration (Days)</TableCell2>
                          <TableCell2>Instructions</TableCell2>
                        </TableRow2>
                      </TableHead2>
                      <TableBody2>
                        {(rx.items ?? []).length === 0 ? (
                          <TableRow2>
                            <TableCell2 colSpan={5}>
                              <Typography2 variant="body2" color="text.secondary">No items</Typography2>
                            </TableCell2>
                          </TableRow2>
                        ) : (
                          (rx.items ?? []).map((it: any) => (
                            <TableRow2 key={it.id}>
                              <TableCell2>{it.medicineName ?? "—"}</TableCell2>
                              <TableCell2>{it.dosage ?? "—"}</TableCell2>
                              <TableCell2>{it.frequency ?? "—"}</TableCell2>
                              <TableCell2>{it.durationDays ?? "—"}</TableCell2>
                              <TableCell2>{it.instructions ?? "—"}</TableCell2>
                            </TableRow2>
                          ))
                        )}
                      </TableBody2>
                    </Table2>
                  </TableContainer2>
                </Paper2>
              ))}
            </Stack2>
          )}
        </CardContent2>
      </Card2>

      {/* ======================= EDIT RX DIALOG (IPD) ======================= */}
      <Dialog2 open={rxEditOpen} onClose={() => setRxEditOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle2>
          <Stack2 direction="row" justifyContent="space-between" alignItems="center">
            <Stack2 spacing={0.2}>
              <Typography2 fontWeight={900}>
                Edit Prescription #{rxForm?.id ?? ""}
              </Typography2>
              <Typography2 variant="body2" color="text.secondary">
                Doctor: <b>{rxForm?.doctorName ?? "—"}</b>
              </Typography2>
            </Stack2>

            <Tooltip2 title="Close">
              <IconButton2 onClick={() => setRxEditOpen(false)}><CloseIcon /></IconButton2>
            </Tooltip2>
          </Stack2>
        </DialogTitle2>

        <DialogContent2 dividers>
          <Stack2 spacing={1.2}>
            <Alert2 severity="info">Editing allowed only for <b>IPD</b> prescriptions.</Alert2>

            {rxError && <Alert2 severity="error">{rxError}</Alert2>}
            {updatePrescription.isError && (
              <Alert2 severity="error">{(updatePrescription.error as any)?.message ?? "Update failed"}</Alert2>
            )}

            {/* ✅ Removed Doctor Name + Status fields (not editable) */}
            <TextField2
              label="Notes"
              value={rxForm?.notes ?? ""}
              onChange={(e) => setRxForm((p) => (p ? { ...p, notes: e.target.value } : p))}
              fullWidth
              multiline
              minRows={2}
            />

            <Divider2 />

            <Stack2 direction="row" justifyContent="space-between" alignItems="center">
              <Typography2 fontWeight={900}>Medicines</Typography2>
              <Button2 size="small" variant="outlined" onClick={addItemRow}>
                Add row
              </Button2>
            </Stack2>

            <TableContainer2 component={Paper2} variant="outlined">
              <Table2 size="small">
                <TableHead2>
                  <TableRow2>
                    <TableCell2 width={220}>Medicine *</TableCell2>
                    <TableCell2 width={140}>Dosage</TableCell2>
                    <TableCell2 width={160}>Frequency</TableCell2>
                    <TableCell2 width={140}>Duration (Days)</TableCell2>
                    <TableCell2>Instructions</TableCell2>
                    <TableCell2 width={70} align="right">Del</TableCell2>
                  </TableRow2>
                </TableHead2>

                <TableBody2>
                  {(rxForm?.items ?? []).map((it, idx) => (
                    <TableRow2 key={idx}>
                      <TableCell2>
                        <TextField2
                          value={it.medicineName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRxForm((p) => {
                              if (!p) return p;
                              const items = [...p.items];
                              items[idx] = { ...items[idx], medicineName: v };
                              return { ...p, items };
                            });
                          }}
                          fullWidth
                          size="small"
                        />
                      </TableCell2>

                      <TableCell2>
                        <TextField2
                          value={it.dosage}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRxForm((p) => {
                              if (!p) return p;
                              const items = [...p.items];
                              items[idx] = { ...items[idx], dosage: v };
                              return { ...p, items };
                            });
                          }}
                          fullWidth
                          size="small"
                        />
                      </TableCell2>

                      <TableCell2>
                        <TextField2
                          value={it.frequency}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRxForm((p) => {
                              if (!p) return p;
                              const items = [...p.items];
                              items[idx] = { ...items[idx], frequency: v };
                              return { ...p, items };
                            });
                          }}
                          fullWidth
                          size="small"
                        />
                      </TableCell2>

                      <TableCell2>
                        <TextField2
                          type="number"
                          value={it.durationDays}
                          onChange={(e) => {
                            const v = e.target.value === "" ? "" : Number(e.target.value);
                            setRxForm((p) => {
                              if (!p) return p;
                              const items = [...p.items];
                              items[idx] = { ...items[idx], durationDays: v as any };
                              return { ...p, items };
                            });
                          }}
                          fullWidth
                          size="small"
                          inputProps={{ min: 0 }}
                        />
                      </TableCell2>

                      <TableCell2>
                        <TextField2
                          value={it.instructions}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRxForm((p) => {
                              if (!p) return p;
                              const items = [...p.items];
                              items[idx] = { ...items[idx], instructions: v };
                              return { ...p, items };
                            });
                          }}
                          fullWidth
                          size="small"
                        />
                      </TableCell2>

                      <TableCell2 align="right">
                        <IconButton2 onClick={() => removeItemRow(idx)} size="small">
                          <DeleteIcon />
                        </IconButton2>
                      </TableCell2>
                    </TableRow2>
                  ))}
                </TableBody2>
              </Table2>
            </TableContainer2>
          </Stack2>
        </DialogContent2>

        <DialogActions2>
          <Button2 variant="outlined" onClick={() => setRxEditOpen(false)}>Cancel</Button2>
          <Button2
            variant="contained"
            onClick={saveEditRx}
            disabled={!isActive || updatePrescription.isPending || !rxForm}
          >
            Update Prescription
          </Button2>
        </DialogActions2>
      </Dialog2>
    </Box2>
  );
}