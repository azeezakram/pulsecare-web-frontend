/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Divider,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import type { WardRes, WardReq } from "../../../features/ward/types";
import type { BedRes, BedReq } from "../../../features/bed/types";

import { useAllDepartments } from "../../../features/department/department-service";
import {
  useWardsByDepartmentId,
  useCreateWard,
  useUpdateWard,
  useDeleteWard,
} from "../../../features/ward/ward-service";
import {
  useBedsByWardId,
  useCreateBed,
  useUpdateBed,
  useDeleteBed,
  useBatchCreateBeds,
} from "../../../features/bed/bed-service";

import ConfirmPasswordDialog from "../../../components/dialog/ConfirmPasswordDialog";
import { usePasswordGate } from "../../../hooks/usePasswordGate";
import { useAuthStore } from "../../../store/auth-store";
import type { ErrorResponseBody } from "../../../common/res-template";

type WardSortKey = "name" | "bedCount" | "occupiedBeds" | "createdAt";
type BedSortKey = "bedNo" | "isTaken" | "createdAt";
type SortDir = "asc" | "desc";

export default function AdminDepartmentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const deptId = Number(id);

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);
  const username = currentUser?.username ?? null;
  const { gate, askPasswordThen, close, confirm } = usePasswordGate(username);

  const deptsQuery = useAllDepartments();
  const dept = (deptsQuery.data ?? []).find((d) => d.id === deptId) ?? null;

  const wardsQuery = useWardsByDepartmentId(Number.isFinite(deptId) ? deptId : undefined);
  const createWard = useCreateWard(deptId);
  const updateWard = useUpdateWard(deptId);
  const deleteWard = useDeleteWard(deptId);

  const [wardSearch, setWardSearch] = useState("");
  const [wardSortKey, setWardSortKey] = useState<WardSortKey>("createdAt");
  const [wardSortDir, setWardSortDir] = useState<SortDir>("desc");

  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  const selectedWard: WardRes | null =
    (wardsQuery.data ?? []).find((w) => w.id === selectedWardId) ?? null;

  const [openWardForm, setOpenWardForm] = useState(false);
  const [wardFormMode, setWardFormMode] = useState<"create" | "edit">("create");
  const [wardName, setWardName] = useState("");
  const [wardBedCount, setWardBedCount] = useState<number>(0);
  const [wardOccupied, setWardOccupied] = useState<number>(0);
  const [editWardId, setEditWardId] = useState<number | null>(null);
  const [wardFormError, setWardFormError] = useState<string | null>(null);

  const [openWardDelete, setOpenWardDelete] = useState(false);
  const [wardToDelete, setWardToDelete] = useState<WardRes | null>(null);

  const [createBedsOnWardCreate, setCreateBedsOnWardCreate] = useState(true);
  const [bedNoPrefix, setBedNoPrefix] = useState("B-");
  const [batchTakenDefault, setBatchTakenDefault] = useState(false);

  const bedsQuery = useBedsByWardId(selectedWard?.id);
  const createBed = useCreateBed(selectedWard?.id);
  const updateBed = useUpdateBed(selectedWard?.id);
  const deleteBed = useDeleteBed(selectedWard?.id);
  const batchCreateBeds = useBatchCreateBeds();

  const [bedSearch, setBedSearch] = useState("");
  const [bedSortKey, setBedSortKey] = useState<BedSortKey>("createdAt");
  const [bedSortDir, setBedSortDir] = useState<SortDir>("desc");

  const [openBedForm, setOpenBedForm] = useState(false);
  const [bedFormMode, setBedFormMode] = useState<"create" | "edit">("create");
  const [bedNo, setBedNo] = useState("");
  const [bedTaken, setBedTaken] = useState(false);
  const [editBedId, setEditBedId] = useState<number | null>(null);
  const [bedFormError, setBedFormError] = useState<string | null>(null);

  const [openBedDelete, setOpenBedDelete] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<BedRes | null>(null);

  const viewWards = useMemo(() => {
    const q = wardSearch.trim().toLowerCase();
    const list = (wardsQuery.data ?? []).filter((w) =>
      q ? (w.name ?? "").toLowerCase().includes(q) : true
    );

    const dir = wardSortDir === "asc" ? 1 : -1;
    const by = (va: any, vb: any) => (va > vb ? 1 : va < vb ? -1 : 0) * dir;

    return [...list].sort((a, b) => {
      switch (wardSortKey) {
        case "name":
          return by((a.name ?? "").toLowerCase(), (b.name ?? "").toLowerCase());
        case "bedCount":
          return by(a.bedCount ?? 0, b.bedCount ?? 0);
        case "occupiedBeds":
          return by(a.occupiedBeds ?? 0, b.occupiedBeds ?? 0);
        case "createdAt":
        default:
          return by(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime());
      }
    });
  }, [wardsQuery.data, wardSearch, wardSortKey, wardSortDir]);

  const viewBeds = useMemo(() => {
    const q = bedSearch.trim().toLowerCase();
    const list = (bedsQuery.data ?? []).filter((b) =>
      q ? (b.bedNo ?? "").toLowerCase().includes(q) : true
    );

    const dir = bedSortDir === "asc" ? 1 : -1;
    const by = (va: any, vb: any) => (va > vb ? 1 : va < vb ? -1 : 0) * dir;

    return [...list].sort((a, b) => {
      switch (bedSortKey) {
        case "bedNo":
          return by((a.bedNo ?? "").toLowerCase(), (b.bedNo ?? "").toLowerCase());
        case "isTaken":
          return by(Boolean(a.isTaken), Boolean(b.isTaken));
        case "createdAt":
        default:
          return by(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime());
      }
    });
  }, [bedsQuery.data, bedSearch, bedSortKey, bedSortDir]);

  if (!id || !Number.isFinite(deptId)) return <Alert severity="error">Missing department id</Alert>;

  const openCreateWard = () => {
    setWardFormError(null);
    setWardFormMode("create");
    setEditWardId(null);
    setWardName("");
    setWardBedCount(0);
    setWardOccupied(0);
    setCreateBedsOnWardCreate(true);
    setBedNoPrefix("B-");
    setBatchTakenDefault(false);
    setOpenWardForm(true);
  };

  const openEditWard = (w: WardRes) => {
    setWardFormError(null);
    setWardFormMode("edit");
    setEditWardId(w.id);
    setWardName(w.name ?? "");
    setWardBedCount(w.bedCount ?? 0);
    setWardOccupied(w.occupiedBeds ?? 0);
    setOpenWardForm(true);
  };

  const submitWard = async () => {
    const payload: WardReq = {
      name: wardName.trim(),
      departmentId: deptId,
      bedCount: wardBedCount,
      occupiedBeds: wardOccupied,
    };
    if (!payload.name) return;

    setWardFormError(null);

    await askPasswordThen({
      title: wardFormMode === "create" ? "Create Ward" : "Update Ward",
      description: "Enter your password to confirm this action.",
      action: async () => {
        try {
          if (wardFormMode === "create") {
            setOpenWardForm(false);

            const createdWard = await createWard.mutateAsync(payload);

            setSelectedWardId(createdWard.id);

            if (createBedsOnWardCreate) {
              const count = Number(payload.bedCount ?? 0);
              if (count > 0) {
                const beds: BedReq[] = Array.from({ length: count }, (_, i) => ({
                  wardId: createdWard.id,
                  bedNo: `${bedNoPrefix}${i + 1}`,
                  isTaken: batchTakenDefault,
                }));
                await batchCreateBeds.mutateAsync({ wardId: createdWard.id, beds });
              }
            }

            await queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", deptId] });
            await queryClient.invalidateQueries({ queryKey: ["wards"] });
          } else if (editWardId) {
            setOpenWardForm(false);
            await updateWard.mutateAsync({ id: editWardId, data: payload });

            await queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", deptId] });
            await queryClient.invalidateQueries({ queryKey: ["wards"] });
          }
        } catch (err) {
          setWardFormError((err as ErrorResponseBody).message);
          setOpenWardForm(true);
        }
      },
    });
  };

  const confirmDeleteWard = (w: WardRes) => {
    setWardToDelete(w);
    setOpenWardDelete(true);
  };

  const doDeleteWard = async () => {
    if (!wardToDelete) return;

    await askPasswordThen({
      title: "Delete Ward",
      description: "Enter your password to delete this ward.",
      action: async () => {
        await deleteWard.mutateAsync(wardToDelete.id);

        if (selectedWardId === wardToDelete.id) setSelectedWardId(null);
        setWardToDelete(null);
        setOpenWardDelete(false);

        await queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", deptId] });
        await queryClient.invalidateQueries({ queryKey: ["wards"] });
      },
    });
  };

  const openCreateBed = () => {
    setBedFormError(null);
    setBedFormMode("create");
    setEditBedId(null);
    setBedNo("");
    setBedTaken(false);
    setOpenBedForm(true);
  };

  const openEditBed = (b: BedRes) => {
    setBedFormError(null);
    setBedFormMode("edit");
    setEditBedId(b.id);
    setBedNo(b.bedNo ?? "");
    setBedTaken(Boolean(b.isTaken));
    setOpenBedForm(true);
  };

  const submitBed = async () => {
    if (!selectedWard?.id) return;

    const payload: BedReq = {
      bedNo: bedNo.trim(),
      isTaken: bedTaken,
      wardId: selectedWard.id,
    };
    if (!payload.bedNo) return;

    setBedFormError(null);

    await askPasswordThen({
      title: bedFormMode === "create" ? "Create Bed" : "Update Bed",
      description: "Enter your password to confirm this action.",
      action: async () => {
        try {
          setOpenBedForm(false);

          if (bedFormMode === "create") {
            await createBed.mutateAsync(payload);
          } else if (editBedId) {
            await updateBed.mutateAsync({ id: editBedId, data: payload });
          }

          await queryClient.invalidateQueries({ queryKey: ["beds", "byWard", selectedWard.id] });
          await queryClient.invalidateQueries({ queryKey: ["beds"] });
          await queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", deptId] });
          await queryClient.invalidateQueries({ queryKey: ["wards"] });
        } catch (err) {
          setBedFormError((err as ErrorResponseBody).message);
          setOpenBedForm(true);
        }
      },
    });
  };

  const confirmDeleteBed = (b: BedRes) => {
    setBedToDelete(b);
    setOpenBedDelete(true);
  };

  const doDeleteBed = async () => {
    if (!bedToDelete || !selectedWard?.id) return;

    await askPasswordThen({
      title: "Delete Bed",
      description: "Enter your password to delete this bed.",
      action: async () => {
        setOpenBedDelete(false);
        await deleteBed.mutateAsync(bedToDelete.id);
        setBedToDelete(null);

        await queryClient.invalidateQueries({ queryKey: ["beds", "byWard", selectedWard.id] });
        await queryClient.invalidateQueries({ queryKey: ["beds"] });
        await queryClient.invalidateQueries({ queryKey: ["wards", "byDepartment", deptId] });
        await queryClient.invalidateQueries({ queryKey: ["wards"] });
      },
    });
  };

  const busy =
    deptsQuery.isLoading ||
    wardsQuery.isLoading ||
    createWard.isPending ||
    updateWard.isPending ||
    deleteWard.isPending ||
    bedsQuery.isLoading ||
    createBed.isPending ||
    updateBed.isPending ||
    deleteBed.isPending ||
    batchCreateBeds.isPending ||
    gate.busy;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          {dept?.name ?? "Department Details"}
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/dashboard/admin/departments")}>
          Back
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          {deptsQuery.isError ? (
            <Alert severity="error">Failed to load department</Alert>
          ) : !dept ? (
            <Alert severity="warning">Department not found</Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography>
                  <b>ID:</b> {dept.id}
                </Typography>
                <Typography>
                  <b>Name:</b> {dept.name ?? "—"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography>
                  <b>Created:</b> {new Date(dept.createdAt).toLocaleString()}
                </Typography>
                <Typography>
                  <b>Updated:</b> {new Date(dept.updatedAt).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>
                Wards
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateWard} disabled={!dept}>
                Add Ward
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
              <TextField
                label="Search wards"
                value={wardSearch}
                onChange={(e) => setWardSearch(e.target.value)}
                fullWidth
              />

              <TextField
                select
                label="Sort by"
                value={wardSortKey}
                onChange={(e) => setWardSortKey(e.target.value as WardSortKey)}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="createdAt">Created date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="bedCount">Bed count</MenuItem>
                <MenuItem value="occupiedBeds">Occupied beds</MenuItem>
              </TextField>

              <Tooltip title={wardSortDir === "asc" ? "Ascending" : "Descending"}>
                <IconButton onClick={() => setWardSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                  {wardSortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Clear search">
                <IconButton onClick={() => setWardSearch("")}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider />

            {wardsQuery.isError && <Alert severity="error">Failed to load wards.</Alert>}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Ward</TableCell>
                    <TableCell>Bed count</TableCell>
                    <TableCell>Occupied</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {wardsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading...</TableCell>
                    </TableRow>
                  ) : viewWards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No wards found.</TableCell>
                    </TableRow>
                  ) : (
                    viewWards.map((w) => (
                      <TableRow
                        key={w.id}
                        hover
                        selected={selectedWard?.id === w.id}
                        onClick={() => setSelectedWardId(w.id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={700}>{w.name ?? "—"}</Typography>
                            <Chip size="small" label={`ID ${w.id}`} />
                          </Stack>
                        </TableCell>
                        <TableCell>{w.bedCount ?? 0}</TableCell>
                        <TableCell>{w.occupiedBeds ?? 0}</TableCell>
                        <TableCell>{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View (select)">
                            <IconButton onClick={() => setSelectedWardId(w.id)}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => openEditWard(w)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => confirmDeleteWard(w)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Accordion expanded={!!selectedWard} disabled={!selectedWard}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={800}>
                  {selectedWard ? `Ward Details • ${selectedWard.name ?? "—"}` : "Select a ward to view details"}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {!selectedWard ? null : (
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={800} sx={{ mb: 1 }}>
                          Ward Info
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography>
                              <b>Ward ID:</b> {selectedWard.id}
                            </Typography>
                            <Typography>
                              <b>Name:</b> {selectedWard.name ?? "—"}
                            </Typography>
                            <Typography>
                              <b>Department ID:</b> {selectedWard.departmentId ?? deptId}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography>
                              <b>Bed count:</b> {selectedWard.bedCount ?? 0}
                            </Typography>
                            <Typography>
                              <b>Occupied beds:</b> {selectedWard.occupiedBeds ?? 0}
                            </Typography>
                            <Typography>
                              <b>Created:</b> {new Date(selectedWard.createdAt).toLocaleString()}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button variant="outlined" onClick={() => openEditWard(selectedWard)} startIcon={<EditIcon />}>
                            Edit Ward
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => confirmDeleteWard(selectedWard)}
                            startIcon={<DeleteIcon />}
                          >
                            Delete Ward
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography fontWeight={800}>Beds</Typography>
                          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateBed}>
                            Add Bed
                          </Button>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <TextField
                            label="Search beds"
                            value={bedSearch}
                            onChange={(e) => setBedSearch(e.target.value)}
                            fullWidth
                          />

                          <TextField
                            select
                            label="Sort by"
                            value={bedSortKey}
                            onChange={(e) => setBedSortKey(e.target.value as BedSortKey)}
                            sx={{ minWidth: 170 }}
                          >
                            <MenuItem value="createdAt">Created date</MenuItem>
                            <MenuItem value="bedNo">Bed no</MenuItem>
                            <MenuItem value="isTaken">Taken</MenuItem>
                          </TextField>

                          <Tooltip title={bedSortDir === "asc" ? "Ascending" : "Descending"}>
                            <IconButton onClick={() => setBedSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                              {bedSortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Clear search">
                            <IconButton onClick={() => setBedSearch("")}>
                              <ClearIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>

                        {bedsQuery.isError && (
                          <Alert severity="error" sx={{ mb: 1 }}>
                            Failed to load beds.
                          </Alert>
                        )}

                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360, overflowY: "auto" }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Bed No</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>

                            <TableBody>
                              {bedsQuery.isLoading ? (
                                <TableRow>
                                  <TableCell colSpan={4}>Loading...</TableCell>
                                </TableRow>
                              ) : viewBeds.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4}>No beds found.</TableCell>
                                </TableRow>
                              ) : (
                                viewBeds.map((b) => (
                                  <TableRow key={b.id} hover>
                                    <TableCell>{b.bedNo ?? "—"}</TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        color={b.isTaken ? "error" : "success"}
                                        label={b.isTaken ? "TAKEN" : "FREE"}
                                      />
                                    </TableCell>
                                    <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="View details">
                                        <IconButton
                                          onClick={() => {
                                            alert(
                                              `Bed Details\n\nID: ${b.id}\nBed No: ${b.bedNo}\nTaken: ${b.isTaken}\nWard ID: ${b.wardId}\nCreated: ${b.createdAt}\nUpdated: ${b.updatedAt}`
                                            );
                                          }}
                                        >
                                          <VisibilityIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Edit">
                                        <IconButton onClick={() => openEditBed(b)}>
                                          <EditIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton color="error" onClick={() => confirmDeleteBed(b)}>
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            {busy && (
              <Typography variant="body2" color="text.secondary">
                Working...
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={openWardForm}
        onClose={() => {
          setOpenWardForm(false);
          setWardFormError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{wardFormMode === "create" ? "Add Ward" : "Edit Ward"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {wardFormError && <Alert severity="error">{wardFormError}</Alert>}

            <TextField label="Ward name" value={wardName} onChange={(e) => setWardName(e.target.value)} fullWidth />

            <TextField
              type="number"
              label="Bed count"
              value={wardBedCount}
              onChange={(e) => setWardBedCount(Math.max(0, Number(e.target.value)))}
              fullWidth
            />

            <TextField
              type="number"
              label="Occupied beds"
              value={wardOccupied}
              onChange={(e) => setWardOccupied(Math.max(0, Number(e.target.value)))}
              fullWidth
            />

            {wardFormMode === "create" && (
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={800}>Batch create beds</Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={createBedsOnWardCreate}
                            onChange={(e) => setCreateBedsOnWardCreate(e.target.checked)}
                          />
                        }
                        label={createBedsOnWardCreate ? "Enabled" : "Disabled"}
                      />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        label="Bed No prefix"
                        value={bedNoPrefix}
                        onChange={(e) => setBedNoPrefix(e.target.value)}
                        fullWidth
                        disabled={!createBedsOnWardCreate}
                      />

                      <TextField
                        select
                        label="Default status"
                        value={batchTakenDefault ? "true" : "false"}
                        onChange={(e) => setBatchTakenDefault(e.target.value === "true")}
                        fullWidth
                        disabled={!createBedsOnWardCreate}
                      >
                        <MenuItem value="false">FREE</MenuItem>
                        <MenuItem value="true">TAKEN</MenuItem>
                      </TextField>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {bedNoPrefix}1 ... {bedNoPrefix}{Math.max(0, wardBedCount || 0)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Alert severity="info">
              Department ID will be set automatically to <b>{deptId}</b>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenWardForm(false);
              setWardFormError(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={submitWard} variant="contained" disabled={!wardName.trim() || busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openWardDelete} onClose={() => setOpenWardDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Ward</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <b>{wardToDelete?.name ?? "this ward"}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWardDelete(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={doDeleteWard} color="error" variant="contained" disabled={busy || !wardToDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openBedForm}
        onClose={() => {
          setOpenBedForm(false);
          setBedFormError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{bedFormMode === "create" ? "Add Bed" : "Edit Bed"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {bedFormError && <Alert severity="error">{bedFormError}</Alert>}

            <TextField label="Bed No" value={bedNo} onChange={(e) => setBedNo(e.target.value)} fullWidth />
            <TextField
              select
              label="Is Taken"
              value={bedTaken ? "true" : "false"}
              onChange={(e) => setBedTaken(e.target.value === "true")}
              fullWidth
            >
              <MenuItem value="false">FREE</MenuItem>
              <MenuItem value="true">TAKEN</MenuItem>
            </TextField>

            <Alert severity="info">
              Ward ID will be set automatically to <b>{selectedWard?.id ?? "—"}</b>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenBedForm(false);
              setBedFormError(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={submitBed} variant="contained" disabled={!bedNo.trim() || !selectedWard || busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBedDelete} onClose={() => setOpenBedDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Bed</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <b>{bedToDelete?.bedNo ?? "this bed"}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBedDelete(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={doDeleteBed} color="error" variant="contained" disabled={busy || !bedToDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmPasswordDialog
        open={gate.open}
        title={gate.title}
        description={gate.description}
        busy={gate.busy}
        error={gate.error}
        onClose={close}
        onConfirm={confirm}
      />
    </Box>
  );
}
