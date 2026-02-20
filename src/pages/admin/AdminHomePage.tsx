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
  Typography
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupsIcon from "@mui/icons-material/Groups";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { useAllPatientAdmissions } from "../../features/patient-admission/patientAdmission-service";
import { useAllPatients } from "../../features/patient/patient-service";
import { useAllUsers } from "../../features/user/user-service";

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}

/** Simple KPI sub-component used in the Admissions summary section */
function KPI({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
      <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary", textTransform: "uppercase" }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 1000, my: 0.5 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{sub}</Typography>}
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
        height: "100%"
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
  const fg = "rgba(255,255,255,0.95)";
  const subFg = "rgba(255,255,255,0.85)";

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        color: fg,
        background: gradient,
        boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
        position: "relative",
        height: "100%"
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          height: "100%",
          p: 0,
          "&:hover .kpi-float": { transform: "translateY(-2px)" },
        }}
        disabled={!onClick}
      >
        <CardContent className="kpi-float" sx={{ p: 2, transition: "transform 150ms ease" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 900, opacity: 0.95 }}>{title}</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 1000, mt: 0.6, lineHeight: 1 }}>{value}</Typography>
              {sub && <Typography sx={{ fontSize: 11, mt: 0.7, color: subFg, fontWeight: 700 }}>{sub}</Typography>}
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
            <Typography sx={{ fontSize: 11, mt: 1.2, color: subFg, fontWeight: 800 }}>
              Click to view →
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function AdminHomePage() {
  const nav = useNavigate();

  const routes = {
    users: "/dashboard/admin/users",
    patients: "/dashboard/admin/patients",
    admissions: "/dashboard/admin/patient-addmissions",
  };

  const usersQ = useAllUsers();
  const patientsQ = useAllPatients();
  const admissionsQ = useAllPatientAdmissions();

  const busy = usersQ.isLoading || patientsQ.isLoading || admissionsQ.isLoading;
  const err = usersQ.isError || patientsQ.isError || admissionsQ.isError;

  const users = usersQ.data ?? [];
  const patients = patientsQ.data ?? [];
  const admissions = admissionsQ.data ?? [];

  // Logic Calculations
  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf())
      .slice(0, 3)
      .map(u => ({
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "—",
        username: u.username ?? "—",
        role: u.role?.name ?? "—",
        joined: fmtDT(u.createdAt),
      }));
  }, [users]);

  const underTreatmentCount = useMemo(() => {
    const active = admissions.filter(a => String(a.status ?? "").toUpperCase() === "ACTIVE");
    return new Set(active.map(a => Number(a.patientId))).size;
  }, [admissions]);

  const recentPatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => dayjs(b.createdAt ?? 0).valueOf() - dayjs(a.createdAt ?? 0).valueOf())
      .slice(0, 3)
      .map(p => ({
        name: p.fullName ?? "—",
        nic: p.nic ?? "—",
        phone: p.phone ?? "—",
        joined: fmtDT(p.createdAt),
      }));
  }, [patients]);

  const admissionSummary = useMemo(() => {
    const total = admissions.length;
    const underTreatment = admissions.filter(a => String(a.status ?? "").toUpperCase() === "ACTIVE").length;
    const discharged = admissions.filter(a => String(a.status ?? "").toUpperCase() === "DISCHARGED" && !!a.dischargedAt).length;
    const pending = admissions.filter(a => String(a.status ?? "").toUpperCase() === "DISCHARGED" && !a.dischargedAt).length;
    return { total, underTreatment, discharged, pending };
  }, [admissions]);

  const recentAdmissions = useMemo(() => {
    return [...admissions]
      .sort((a, b) => dayjs(b.admittedAt ?? 0).valueOf() - dayjs(a.admittedAt ?? 0).valueOf())
      .slice(0, 3)
      .map(a => ({
        admissionId: a.id,
        patientId: a.patientId ?? "—",
        status: String(a.status ?? "—").toUpperCase(),
        admittedAt: fmtDT(a.admittedAt),
        dischargedAt: fmtDT(a.dischargedAt),
      }));
  }, [admissions]);

  return (
    <Box sx={{ py: 2 }}>
      <Stack spacing={0.3} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={1000}>Admin Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Modern overview • click cards to navigate</Typography>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>Failed to load dashboard data.</Alert>}
      {busy && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards Section */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Total users"
            value={users.length}
            sub="Manage system accounts"
            icon={<PeopleAltIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #4f46e5, #06b6d4)"
            onClick={() => nav(routes.users)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Total patients"
            value={patients.length}
            sub="Patient registry"
            icon={<GroupsIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #16a34a, #22c55e)"
            onClick={() => nav(routes.patients)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Under treatment"
            value={underTreatmentCount}
            sub="Unique ACTIVE admissions"
            icon={<LocalHospitalIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #f59e0b, #fb7185)"
            onClick={() => nav(routes.admissions)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <ColorKpiCard
            title="Admissions"
            value={admissionSummary.total}
            sub={`Act ${admissionSummary.underTreatment} • Disch ${admissionSummary.discharged} • Pend ${admissionSummary.pending}`}
            icon={<AssignmentTurnedInIcon sx={{ color: "white" }} />}
            gradient="linear-gradient(135deg, #0ea5e9, #8b5cf6)"
            onClick={() => nav(routes.admissions)}
          />
        </Grid>
      </Grid>

      {/* Main Tables and Detailed Summaries */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <MiniTable
            title="Recently joined users"
            columns={[
              { key: "name", label: "Name" },
              { key: "username", label: "Username" },
              { key: "role", label: "Role" },
              { key: "joined", label: "Joined" },
            ]}
            rows={recentUsers}
            emptyText="No users found"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MiniTable
            title="Recently joined patients"
            columns={[
              { key: "name", label: "Name" },
              { key: "nic", label: "NIC" },
              { key: "phone", label: "Phone" },
              { key: "joined", label: "Joined" },
            ]}
            rows={recentPatients}
            emptyText="No patients found"
          />
        </Grid>

<Grid size={{ xs: 12 }}>
  <Card
    sx={{
      borderRadius: 3,
      boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
      background: "linear-gradient(135deg, #0ea5e9, #6366f1)", // Modern blue-to-indigo gradient
      color: "white",
      overflow: "hidden",
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontWeight={1000} sx={{ fontSize: 18 }}>
          Admissions Summary
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => nav(routes.admissions)}
          sx={{ 
            color: "rgba(255,255,255,0.9)", 
            fontWeight: 800,
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } 
          }}
        >
          View all →
        </Button>
      </Stack>

      <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KPI title="Total" value={admissionSummary.total} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KPI title="Active" value={admissionSummary.underTreatment} sub="In Treatment" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KPI title="Discharged" value={admissionSummary.discharged} sub="Finalized" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KPI title="Pending" value={admissionSummary.pending} sub="Awaiting Conf." />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
</Grid>

        <Grid size={{ xs: 12 }}>
          <MiniTable
            title="Recent admissions"
            columns={[
              { key: "admissionId", label: "Admission #" },
              { key: "patientId", label: "Patient ID" },
              { key: "status", label: "Status" },
              { key: "admittedAt", label: "Admitted" },
              { key: "dischargedAt", label: "Discharged" },
            ]}
            rows={recentAdmissions}
            emptyText="No admissions found"
          />
        </Grid>
      </Grid>
    </Box>
  );
}