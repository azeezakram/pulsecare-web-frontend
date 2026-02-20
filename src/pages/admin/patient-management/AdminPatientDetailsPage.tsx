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
import { useMemo, useState } from "react";

import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import * as str from "text-case";

import { useAllPatientAdmissions } from "../../../features/patient-admission/patientAdmission-service";
import { useAllPatientQueues } from "../../../features/patient-queue/patientQueue-service";
import { usePatientById } from "../../../features/patient/patient-service";

import { useAllBeds } from "../../../features/bed/bed-service";
import type { BedRes } from "../../../features/bed/types";
import { useAllDepartments } from "../../../features/department/department-service";
import type { DeptRes } from "../../../features/department/types";
import type { PatientAdmissionRes } from "../../../features/patient-admission/types";
import type { WardRes } from "../../../features/ward/types";
import { useAllWards } from "../../../features/ward/ward-service";

function fmtDT(v?: string) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : v;
}

function statusChip(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return <Chip size="small" color="warning" label="UNDER TREATMENT" />;
  if (s === "DISCHARGED") return <Chip size="small" color="success" label="DISCHARGED" />;
  if (s === "TRANSFERRED") return <Chip size="small" label="TRANSFERRED" />;
  return <Chip size="small" variant="outlined" label="—" />;
}

function latestAdmissionStatus(admissions: PatientAdmissionRes[]) {
  const sorted = [...admissions].sort((a, b) => {
    const at = dayjs(a.admittedAt ?? a.dischargedAt ?? 0).valueOf();
    const bt = dayjs(b.admittedAt ?? b.dischargedAt ?? 0).valueOf();
    return bt - at;
  });
  return sorted[0]?.status ?? null;
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

type HistoryTab = "ADMISSIONS" | "QUEUE";

export default function AdminPatientDetailsPage() {
  const nav = useNavigate();
  const { id: idRaw } = useParams();
  const id = Number(idRaw);

  const patientQuery = usePatientById(id);
  const admissionsQuery = useAllPatientAdmissions();
  const queuesQuery = useAllPatientQueues();
  const bedsQuery = useAllBeds();
  const wardsQuery = useAllWards();
  const deptsQuery = useAllDepartments();

  const [historyTab, setHistoryTab] = useState<HistoryTab>("ADMISSIONS");

  const admissions = useMemo(() => {
    const all = admissionsQuery.data ?? [];
    return all
      .filter((a) => Number(a.patientId) === id)
      .sort(
        (a, b) =>
          dayjs(b.admittedAt ?? b.dischargedAt ?? 0).valueOf() -
          dayjs(a.admittedAt ?? a.dischargedAt ?? 0).valueOf()
      );
  }, [admissionsQuery.data, id]);

  const queues = useMemo(() => {
    const all = queuesQuery.data ?? [];
    return all
      .filter((q) => Number(q.patientId) === id)
      .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf());
  }, [queuesQuery.data, id]);


  const currentStatus = useMemo(() => latestAdmissionStatus(admissions), [admissions]);

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


  const busy =
    patientQuery.isLoading ||
    admissionsQuery.isLoading ||
    queuesQuery.isLoading ||
    bedsQuery.isLoading ||
    wardsQuery.isLoading ||
    deptsQuery.isLoading;


  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack spacing={0.6}>
          <Typography variant="h5" fontWeight={900}>
            Patient Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Profile • Status • Histories
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => nav("/dashboard/admin/patients")}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => nav(`/dashboard/admin/patients/${id}/edit`)}
            disabled={!patientQuery.data || busy}
          >
            Edit
          </Button>
        </Stack>
      </Stack>

      {(patientQuery.isError ||
        admissionsQuery.isError ||
        queuesQuery.isError ||
        bedsQuery.isError ||
        wardsQuery.isError ||
        deptsQuery.isError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(patientQuery.error as any)?.message ??
              (admissionsQuery.error as any)?.message ??
              (queuesQuery.error as any)?.message ??
              (bedsQuery.error as any)?.message ??
              (wardsQuery.error as any)?.message ??
              (deptsQuery.error as any)?.message ??
              "Failed to load patient details."}
          </Alert>
        )}


      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" fontWeight={900}>
                    {patientQuery.data?.fullName ?? "—"}
                  </Typography>
                  {statusChip(currentStatus)}
                </Stack>

                <Divider />

                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography>
                      <b>NIC:</b> {patientQuery.data?.nic ?? "—"}
                    </Typography>
                    <Typography>
                      <b>Gender:</b> {str.pascalCase(String(patientQuery.data?.gender)) ?? "—"}
                    </Typography>
                    <Typography>
                      <b>DOB:</b> {patientQuery.data?.dob ?? "—"}
                    </Typography>
                    <Typography>
                      <b>Phone:</b> {patientQuery.data?.phone ?? "—"}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography>
                      <b>Blood Group:</b> {patientQuery.data?.bloodGroup ?? "—"}
                    </Typography>
                    <Typography>
                      <b>Created:</b> {fmtDT(patientQuery.data?.createdAt)}
                    </Typography>
                    <Typography>
                      <b>Is Active:</b> {patientQuery.data?.isActive ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={900}>Quick Stats</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                <Typography>
                  <b>Admission History:</b> {admissions.length}
                </Typography>
                <Typography>
                  <b>Queue History:</b> {queues.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography fontWeight={900}>History</Typography>

            <Tabs
              value={historyTab}
              onChange={(_, v) => setHistoryTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
            >
              <Tab value="ADMISSIONS" label={`Admissions (${admissions.length})`} />
              <Tab value="QUEUE" label={`Queue (${queues.length})`} />
            </Tabs>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {historyTab === "ADMISSIONS" && (
            <>
              {admissionsQuery.isLoading ? (
                <Alert severity="info">Loading admissions…</Alert>
              ) : admissions.length === 0 ? (
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
                      {[...admissions]
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
                                  <TableCell>{fmtDT(a.admittedAt)}</TableCell>
                                  <TableCell>{fmtDT(a.dischargedAt)}</TableCell>
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

          {historyTab === "QUEUE" && (
            <>
              {(queuesQuery as any).isLoading ? (
                <Alert severity="info">Loading queue history…</Alert>
              ) : queues.length === 0 ? (
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
                      {[...queues]
                        .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf())
                        .slice(0, 200)
                        .map((q) => (
                          <TableRow key={q.id} hover>
                            <TableCell>{priorityChip(q.priority ?? null)}</TableCell>
                            <TableCell>{queueStatusChip(q.status ?? null)}</TableCell>
                            <TableCell>{q.triageLevel ?? "—"}</TableCell>
                            <TableCell>{fmtDT(q.createdAt)}</TableCell>
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

    </Box>
  );
}
