/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import HealingIcon from "@mui/icons-material/Healing";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TodayIcon from "@mui/icons-material/Today";

import { useAllPatientQueues } from "../../features/patient-queue/patientQueue-service";
import { useAllPatientAdmissions } from "../../features/patient-admission/patientAdmission-service";

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}

/** Glassmorphism KPI sub-component */
function KPICard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        height: "100%",
        bgcolor: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        color: "white",
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 900, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 1000, my: 0.5 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700, display: "block" }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

function MiniTable({
  title,
  columns,
  rows,
  emptyText = "No data",
}: {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, any>[];
  emptyText?: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        height: "100%",
      }}
    >
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={900}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">latest 3</Typography>
        </Stack>

        <Divider sx={{ my: 1.2 }} />

        {rows.length === 0 ? (
          <Alert severity="info">{emptyText}</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260, borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.key} align={c.align ?? "left"} sx={{ fontWeight: 900 }}>
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={idx} hover>
                    {columns.map((c) => (
                      <TableCell key={c.key} align={c.align ?? "left"}>
                        {r[c.key] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ColorKpiCard({
  title,
  value,
  sub,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        color: "rgba(255,255,255,0.95)",
        background: gradient,
        boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
        height: "100%",
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={!onClick}
        sx={{ height: "100%", "&:hover .kpi-float": { transform: "translateY(-2px)" } }}
      >
        <CardContent className="kpi-float" sx={{ p: 2, transition: "transform 150ms ease" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 900, opacity: 0.95 }}>{title}</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 1000, mt: 0.6, lineHeight: 1 }}>{value}</Typography>
              {sub && (
                <Typography sx={{ fontSize: 11, mt: 0.7, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                  {sub}
                </Typography>
              )}
            </Box>

            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.18)",
                width: 44,
                height: 44,
                backdropFilter: "blur(6px)",
              }}
            >
              {icon}
            </Avatar>
          </Stack>

          {onClick && (
            <Typography sx={{ fontSize: 11, mt: 1.2, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
              Click to view →
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DoctorHomePage() {
  const nav = useNavigate();

  const routes = {
    queue: "/dashboard/doctor/patient-queue",
    admissions: "/dashboard/doctor/patient-admissions",
  };

  const queuesQ = useAllPatientQueues();
  const admissionsQ = useAllPatientAdmissions();

  const busy = queuesQ.isLoading || admissionsQ.isLoading;
  const err = queuesQ.isError || admissionsQ.isError;

  const queues = queuesQ.data ?? [];
  const admissions = admissionsQ.data ?? [];

  const summary = useMemo(() => {
    const waiting = queues.filter((q: any) => String(q.status ?? "").toUpperCase() === "WAITING").length;
    const critical = queues.filter(
      (q: any) => String(q.status ?? "").toUpperCase() === "WAITING" && String(q.priority ?? "").toUpperCase() === "CRITICAL"
    ).length;
    const activeAdmissions = admissions.filter((a: any) => String(a.status ?? "").toUpperCase() === "ACTIVE").length;
    const todayAdmissions = admissions.filter((a: any) => dayjs(a.admittedAt).isSame(dayjs(), "day")).length;

    return { waiting, critical, activeAdmissions, todayAdmissions };
  }, [queues, admissions]);

  const recentWaiting = useMemo(() => {
    return [...queues]
      .filter((q: any) => String(q.status ?? "").toUpperCase() === "WAITING")
      .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf())
      .slice(0, 3)
      .map((q: any) => ({
        queueId: q.id,
        patient: q.patientName ?? `Patient ${q.patientId ?? "—"}`,
        priority: String(q.priority ?? "—").toUpperCase(),
        triage: q.triageLevel ?? "—",
      }));
  }, [queues]);

  const recentActiveAdmissions = useMemo(() => {
    return [...admissions]
      .filter((a: any) => String(a.status ?? "").toUpperCase() === "ACTIVE")
      .sort((a, b) => dayjs(b.admittedAt ?? 0).valueOf() - dayjs(a.admittedAt ?? 0).valueOf())
      .slice(0, 3)
      .map((a: any) => ({
        admissionId: a.id,
        patientId: a.patientId ?? "—",
        admittedAt: fmtDT(a.admittedAt),
        status: String(a.status ?? "—").toUpperCase(),
      }));
  }, [admissions]);

  return (
    <Box sx={{ py: 2 }}>
      <Stack spacing={0.3} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={1000}>Doctor Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Clinical overview • triage • treatment • admissions</Typography>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>Failed to load clinical data.</Alert>}
      {busy && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Waiting Queue"
            value={summary.waiting}
            sub="Patients in waiting"
            icon={<HealingIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #0ea5e9, #22c55e)"
            onClick={() => nav(routes.queue)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Critical Cases"
            value={summary.critical}
            sub="Priority = CRITICAL"
            icon={<WarningAmberIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #ef4444, #f59e0b)"
            onClick={() => nav(routes.queue)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Ward Patients"
            value={summary.activeAdmissions}
            sub="Inpatient Treatment"
            icon={<LocalHospitalIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #8b5cf6, #0ea5e9)"
            onClick={() => nav(routes.admissions)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="New Admissions"
            value={summary.todayAdmissions}
            sub="Admitted Today"
            icon={<TodayIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #14b8a6, #06b6d4)"
            onClick={() => nav(routes.admissions)}
          />
        </Grid>
      </Grid>

      {/* Tables Section with Modern Summary Card */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
              background: "linear-gradient(135deg, #059669, #3b82f6)", 
              color: "white",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={1000} sx={{ fontSize: 18 }}>Patient Status Summary</Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => nav(routes.admissions)}
                  sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 800, "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
                >
                  Manage Admissions →
                </Button>
              </Stack>
              <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <KPICard title="Queue" value={summary.waiting} sub="Active Queue" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <KPICard title="Urgent" value={summary.critical} sub="Triage 1 & 2" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <KPICard title="Admitted" value={summary.activeAdmissions} sub="Under Care" />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <KPICard title="Fresh" value={summary.todayAdmissions} sub="Last 24h" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MiniTable
            title="Latest in Queue"
            columns={[
              { key: "queueId", label: "Queue #" },
              { key: "patient", label: "Patient" },
              { key: "priority", label: "Priority" },
              { key: "triage", label: "Triage" },
            ]}
            rows={recentWaiting}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MiniTable
            title="Recent Admissions"
            columns={[
              { key: "admissionId", label: "ID" },
              { key: "patientId", label: "Patient" },
              { key: "admittedAt", label: "Admitted" },
              { key: "status", label: "Status" },
            ]}
            rows={recentActiveAdmissions}
          />
        </Grid>
      </Grid>
    </Box>
  );
}