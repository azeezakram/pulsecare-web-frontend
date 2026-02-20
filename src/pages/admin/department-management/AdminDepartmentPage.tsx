/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState, useEffect } from "react";
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
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popper,
  ClickAwayListener,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { useNavigate } from "react-router-dom";

import type { DeptReq, DeptRes } from "../../../features/department/types";
import {
  useAllDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../../../features/department/department-service";

import ConfirmPasswordDialog from "../../../components/dialog/ConfirmPasswordDialog";
import { usePasswordGate } from "../../../hooks/usePasswordGate";
import { useAuthStore } from "../../../store/auth-store";
import type { ErrorResponseBody } from "../../../common/res-template";

type SortDir = "asc" | "desc";
type DeptSortKey = "name" | "createdAt";

export default function AdminDepartmentsPage() {
  const navigate = useNavigate();

  const deptsQuery = useAllDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const currentUser = useAuthStore((s) => s.currentUser);
  const username = currentUser?.username ?? null;
  const { gate, askPasswordThen, close, confirm } = usePasswordGate(username);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<DeptSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [openDelete, setOpenDelete] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DeptRes | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDeptId, setFormDeptId] = useState<number | null>(null);
  const [deptName, setDeptName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorWidth, setAnchorWidth] = useState<number>(0);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    const el = searchBoxRef.current;
    if (!el) return;

    setAnchorEl(el);
    const updateWidth = () => setAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (deptsQuery.data ?? [])
      .filter((d) => (d.name ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [deptsQuery.data, search]);

  const viewDepts = useMemo(() => {
    const list = deptsQuery.data ?? [];

    const dir = sortDir === "asc" ? 1 : -1;
    const by = (va: any, vb: any) => (va > vb ? 1 : va < vb ? -1 : 0) * dir;

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return by((a.name ?? "").toLowerCase(), (b.name ?? "").toLowerCase());
        case "createdAt":
        default:
          return by(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime());
      }
    });
  }, [deptsQuery.data, sortKey, sortDir]);


  const openCreate = () => {
    setFormError(null);
    setFormMode("create");
    setFormDeptId(null);
    setDeptName("");
    setOpenForm(true);
  };

  const openEdit = (d: DeptRes) => {
    setFormError(null);
    setFormMode("edit");
    setFormDeptId(d.id);
    setDeptName(d.name ?? "");
    setOpenForm(true);
  };

  const submitForm = async () => {
    const name = deptName.trim();
    if (!name) return;

    setFormError(null);

    await askPasswordThen({
      title: formMode === "create" ? "Create Department" : "Update Department",
      description: "Enter your password to confirm this action.",
      action: async () => {
        try {
          setOpenForm(false);

          const payload: DeptReq = { name };

          if (formMode === "create") {
            await createDept.mutateAsync(payload);
          } else if (formDeptId) {
            await updateDept.mutateAsync({ id: formDeptId, data: payload });
          }
        } catch (err) {
          setFormError((err as ErrorResponseBody).message);
          setOpenForm(true);
        }
      },
    });
  };

  const handleOpenDelete = (d: DeptRes) => {
    setDeleteError(null);
    setSelectedDept(d);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!selectedDept) return;

    setDeleteError(null);

    await askPasswordThen({
      title: "Delete Department",
      description: "Enter your password to delete this department.",
      action: async () => {
        try {
          setOpenDelete(false);
          await deleteDept.mutateAsync(selectedDept.id);
          setSelectedDept(null);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Delete failed. Please try again.";
          setDeleteError(msg);
          setOpenDelete(true);
        }
      },
    });
  };

  const busy =
    deptsQuery.isLoading ||
    createDept.isPending ||
    updateDept.isPending ||
    deleteDept.isPending ||
    gate.busy;

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Department Management
        </Typography>

        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add New Department
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Box ref={searchBoxRef}>
              <TextField
                label="Search departments"
                placeholder="Search by department name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => {
                  if (search.trim()) setSuggestOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSuggestOpen(false);
                }}
                fullWidth
              />

            </Box>

            <Popper
              open={suggestOpen && !!search.trim() && !!anchorEl}
              anchorEl={anchorEl}
              placement="bottom-start"
              style={{ zIndex: 1300, width: anchorWidth }}
            >
              <ClickAwayListener onClickAway={() => setSuggestOpen(false)}>
                <Paper variant="outlined" sx={{ mt: 1, maxHeight: 320, overflowY: "auto" }}>
                  {searchSuggestions.length === 0 ? (
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        No matches
                      </Typography>
                    </Box>
                  ) : (
                    <List dense disablePadding>
                      {searchSuggestions.map((d) => (
                        <ListItemButton
                          key={d.id}
                          onClick={() => {
                            setSuggestOpen(false);
                            navigate(`/dashboard/admin/departments/${d.id}`);
                          }}
                        >
                          <ListItemText primary={`${d.name ?? "—"} • ID ${d.id}`} secondary={d.createdAt} />
                          <Chip size="small" label="DEPT" />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              </ClickAwayListener>
            </Popper>

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                label="Sort by"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as DeptSortKey)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="createdAt">Created date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </TextField>

              <Tooltip title={sortDir === "asc" ? "Ascending" : "Descending"}>
                <IconButton onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                  {sortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Clear search">
                <IconButton
                  onClick={() => {
                    setSearch("");
                    setSuggestOpen(false);
                  }}
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider />

            {deptsQuery.isError && <Alert severity="error">{deptsQuery.error?.message ?? "Failed to load departments."}</Alert>}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {deptsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading...</TableCell>
                    </TableRow>
                  ) : viewDepts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No departments found.</TableCell>
                    </TableRow>
                  ) : (
                    viewDepts.map((d) => (
                      <TableRow key={d.id} hover>
                        <TableCell>{d.name ?? "—"}</TableCell>
                        <TableCell>{d.id}</TableCell>
                        <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(d.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <IconButton onClick={() => navigate(`/dashboard/admin/departments/${d.id}`)}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit">
                            <IconButton onClick={() => openEdit(d)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => handleOpenDelete(d)}>
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

            {busy && (
              <Typography variant="body2" color="text.secondary">
                Working...
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setFormError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{formMode === "create" ? "Add Department" : "Edit Department"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Department name"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              fullWidth
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenForm(false);
              setFormError(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={submitForm} variant="contained" disabled={!deptName.trim() || busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDelete}
        onClose={() => {
          setOpenDelete(false);
          setDeleteError(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <Typography>
              Are you sure you want to delete <b>{selectedDept?.name ?? "this department"}</b>?
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={busy || !selectedDept}>
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
