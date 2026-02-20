/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
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
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useActivePatientById } from "../../../features/patient/patient-service";

import { useAllPatientAdmissions } from "../../../features/patient-admission/patientAdmission-service";
import type { PatientAdmissionRes } from "../../../features/patient-admission/types";

import { useAllBeds } from "../../../features/bed/bed-service";
import type { BedRes } from "../../../features/bed/types";
import { useAllDepartments } from "../../../features/department/department-service";
import type { DeptRes } from "../../../features/department/types";
import { useAllPatientQueues } from "../../../features/patient-queue/patientQueue-service";
import type { WardRes } from "../../../features/ward/types";
import { useAllWards } from "../../../features/ward/ward-service";

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : v;
}

function fmtDateTime(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : v;
}

function latestAdmissionStatus(admissions: PatientAdmissionRes[]) {
  const sorted = [...admissions].sort((a, b) => {
    const at = dayjs(a.admittedAt ?? a.dischargedAt ?? 0).valueOf();
    const bt = dayjs(b.admittedAt ?? b.dischargedAt ?? 0).valueOf();
    return bt - at;
  });
  return sorted[0]?.status ?? null;
}

function statusChip(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return <Chip size="small" color="warning" label="UNDER TREATMENT" />;
  if (s === "DISCHARGED") return <Chip size="small" color="success" label="DISCHARGED" />;
  if (s === "TRANSFERRED") return <Chip size="small" label="TRANSFERRED" />;
  return <Chip size="small" variant="outlined" label="—" />;
}

function queueStatusChip(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "WAITING") return <Chip size="small" color="warning" label="WAITING" />;
  if (s === "ADMITTED") return <Chip size="small" color="success" label="ADMITTED" />;
  if (s === "CANCELLED") return <Chip size="small" color="error" label="CANCELLED" />;
  if (s === "OUTPATIENT") return <Chip size="small" label="OUTPATIENT" />;
  return <Chip size="small" variant="outlined" label="—" />;
}

function priorityChip(priority?: string | null) {
  const p = (priority ?? "").toUpperCase();
  if (p === "CRITICAL") return <Chip size="small" color="error" label="CRITICAL" />;
  if (p === "NON_CRITICAL") return <Chip size="small" color="success" label="NON-CRITICAL" />;
  if (p === "NORMAL") return <Chip size="small" label="NORMAL" />;
  return <Chip size="small" variant="outlined" label="—" />;
}

type TabKey = "ADMISSIONS" | "QUEUE";

export default function NursePatientDetailsPage() {
  const nav = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const patientQuery = useActivePatientById(id);

  const admissionsQuery = useAllPatientAdmissions();

  const queueQuery = useAllPatientQueues();
  const bedsQuery = useAllBeds();
  const wardsQuery = useAllWards();
  const deptsQuery = useAllDepartments();


  const admissionsAll = useMemo(() => admissionsQuery.data ?? [], [admissionsQuery.data]);
  const admissionList = useMemo(
    () => admissionsAll.filter((a) => Number(a.patientId) === id),
    [admissionsAll, id]
  );

  const queueAll = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);
  const queueList = useMemo(
    () => queueAll.filter((q) => Number(q.patientId) === id),
    [queueAll, id]
  );

  const status = useMemo(() => latestAdmissionStatus(admissionList), [admissionList]);

  const bedById = useMemo(() => {
    const m = new Map<number, BedRes>();
    (bedsQuery.data ?? []).forEach((b) => m.set(b.id, b));
    return m;
  }, [bedsQuery.data]);

  const wardById = useMemo(() => {
    const m = new Map<number, WardRes>();
    (wardsQuery.data ?? []).forEach((w) => m.set(w.id, w));
    return m;
  }, [wardsQuery.data]);

  const deptById = useMemo(() => {
    const m = new Map<number, DeptRes>();
    (deptsQuery.data ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [deptsQuery.data]);


  const [tab, setTab] = useState<TabKey>("ADMISSIONS");


  const busy =
    patientQuery.isLoading ||
    admissionsQuery.isLoading ||
    queueQuery.isLoading ||
    bedsQuery.isLoading ||
    wardsQuery.isLoading ||
    deptsQuery.isLoading;


  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.4}>
          <Typography variant="h5" fontWeight={900}>
            Patient Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patient info • Status • History tables
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => nav("/dashboard/nurse/patients")} disabled={busy}>
            Back
          </Button>
          <Button variant="contained" onClick={() => nav(`/dashboard/nurse/patients/${id}/edit`)} disabled={busy}>
            Edit
          </Button>
        </Stack>
      </Stack>

      {(patientQuery.isError ||
        admissionsQuery.isError ||
        queueQuery.isError ||
        bedsQuery.isError ||
        wardsQuery.isError ||
        deptsQuery.isError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(patientQuery.error as any)?.message ??
              (admissionsQuery.error as any)?.message ??
              (queueQuery.error as any)?.message ??
              (bedsQuery.error as any)?.message ??
              (wardsQuery.error as any)?.message ??
              (deptsQuery.error as any)?.message ??
              "Failed to load patient details."}
          </Alert>
        )}


      {!patientQuery.data ? (
        <Alert severity="info">Loading…</Alert>
      ) : (
        <Stack spacing={2}>
          {/* Patient summary */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Patient Information</Typography>
                {statusChip(status)}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography>
                    <b>Name:</b> {patientQuery.data.fullName ?? "—"}
                  </Typography>
                  <Typography>
                    <b>NIC:</b> {patientQuery.data.nic ?? "—"}
                  </Typography>
                  <Typography>
                    <b>Gender:</b> {patientQuery.data.gender ?? "—"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography>
                    <b>DOB:</b> {fmtDate(patientQuery.data.dob)}
                  </Typography>
                  <Typography>
                    <b>Blood Group:</b> {patientQuery.data.bloodGroup ?? "—"}
                  </Typography>
                  <Typography>
                    <b>Phone:</b> {patientQuery.data.phone ?? "—"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created: {fmtDateTime(patientQuery.data.createdAt)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography fontWeight={900}>History</Typography>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
                >
                  <Tab value="ADMISSIONS" label={`Admissions (${admissionList.length})`} />
                  <Tab value="QUEUE" label={`Queue (${queueList.length})`} />
                </Tabs>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Admissions Table */}
              {tab === "ADMISSIONS" && (
                <>
                  {admissionsQuery.isLoading ? (
                    <Alert severity="info">Loading admissions…</Alert>
                  ) : admissionList.length === 0 ? (
                    <Alert severity="info">No admission records.</Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowY: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Department</TableCell>
                            <TableCell>Ward</TableCell>
                            <TableCell>Bed No</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Admitted</TableCell>
                            <TableCell>Discharged</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>


                        <TableBody>
                          {[...admissionList]
                            .sort((a, b) => dayjs(b.admittedAt ?? b.dischargedAt ?? 0).valueOf() - dayjs(a.admittedAt ?? a.dischargedAt ?? 0).valueOf())
                            .slice(0, 200)
                            .map((a) => (
                              <TableRow key={a.id} hover>
                                {(() => {
                                  const bed = a.bedId ? bedById.get(a.bedId) : undefined;
                                  const ward = bed?.wardId ? wardById.get(bed.wardId) : undefined;
                                  const dept = ward?.departmentId ? deptById.get(ward.departmentId) : undefined;

                                  return (
                                    <>
                                      <TableCell>{dept?.name ?? "—"}</TableCell>
                                      <TableCell>{ward?.name ?? "—"}</TableCell>
                                      <TableCell>{bed?.bedNo ?? "—"}</TableCell>
                                      <TableCell>{statusChip(a.status ?? null)}</TableCell>
                                      <TableCell>{fmtDateTime(a.admittedAt)}</TableCell>
                                      <TableCell>{fmtDateTime(a.dischargedAt)}</TableCell>
                                      <TableCell>{a.dischargeNotes ? String(a.dischargeNotes).slice(0, 60) : "—"}</TableCell>
                                    </>
                                  );
                                })()}
                              </TableRow>

                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}

              {tab === "QUEUE" && (
                <>
                  {(queueQuery as any).isLoading ? (
                    <Alert severity="info">Loading queue history…</Alert>
                  ) : queueList.length === 0 ? (
                    <Alert severity="info">
                      No queue records.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowY: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Triage Level</TableCell>
                            <TableCell>Created</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {[...queueList]
                            .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf())
                            .slice(0, 200)
                            .map((q) => (
                              <TableRow key={q.id} hover>
                                <TableCell>{priorityChip(q.priority ?? null)}</TableCell>
                                <TableCell>{queueStatusChip(q.status ?? null)}</TableCell>
                                <TableCell>{q.triageLevel ?? "—"}</TableCell>
                                <TableCell>{fmtDate(q.createdAt)}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
