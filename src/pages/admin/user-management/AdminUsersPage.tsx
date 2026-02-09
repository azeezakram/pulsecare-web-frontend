/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
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
  Avatar,
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

import type { UserRes } from "../../../features/user/types";
import { useAllUsers, useDeleteUser } from "../../../features/user/user-service";
import { useAuthStore } from "../../../store/auth-store";

type SortKey = "name" | "username" | "role" | "createdAt" | "active";
type SortDir = "asc" | "desc";

const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPER_DOCTOR: "SUPER_DOCTOR",
  SUPER_NURSE: "SUPER_NURSE",
} as const;

const roleUpper = (u?: UserRes | null) => (u?.role?.name ?? "").toUpperCase();

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const usersQuery = useAllUsers();
  const deleteUserMutation = useDeleteUser();

  const currentUser = useAuthStore((s) => s.currentUser);
  const currentRole = roleUpper(currentUser);

  const isSuperAdmin = currentRole === ROLE.SUPER_ADMIN;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [openDelete, setOpenDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRes | null>(null);

  const searchBoxRef = React.useRef<HTMLDivElement | null>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [anchorWidth, setAnchorWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const el = searchBoxRef.current;
    if (!el) return;

    setAnchorEl(el);

    const updateWidth = () => setAnchorWidth(el.getBoundingClientRect().width);
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const isTargetSuperAdmin = (u: UserRes) => roleUpper(u) === ROLE.SUPER_ADMIN;

  const isTargetSuperStaff = (u: UserRes) => {
    const r = roleUpper(u);
    return r === ROLE.SUPER_DOCTOR || r === ROLE.SUPER_NURSE;
  };

  const isSelf = (u: UserRes) => Boolean(currentUser?.id && u.id === currentUser.id);

  const canEditUser = (target: UserRes) => {
    if (isTargetSuperAdmin(target)) return false;
    if (isTargetSuperStaff(target)) return isSuperAdmin;
    return true;
  };

  const canDeleteUser = (target: UserRes) => {
    if (isSelf(target)) return false;
    if (isTargetSuperAdmin(target)) return false;
    if (isTargetSuperStaff(target)) return isSuperAdmin;
    return true;
  };

  const editReason = (target: UserRes) => {
    if (isTargetSuperAdmin(target)) return "Super Admin cannot be edited.";
    if (isTargetSuperStaff(target) && !isSuperAdmin)
      return "Only Super Admin can edit SUPER_DOCTOR / SUPER_NURSE.";
    return "";
  };

  const deleteReason = (target: UserRes) => {
    if (isSelf(target)) return "You cannot delete your own account.";
    if (isTargetSuperAdmin(target)) return "Super Admin accounts cannot be deleted.";
    if (isTargetSuperStaff(target) && !isSuperAdmin)
      return "Only Super Admin can delete SUPER_DOCTOR / SUPER_NURSE.";
    return "";
  };

  const viewUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const dir = sortDir === "asc" ? 1 : -1;
    const by = (va: any, vb: any) => (va > vb ? 1 : va < vb ? -1 : 0) * dir;

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return by(
            `${a.firstName} ${a.lastName}`.toLowerCase(),
            `${b.firstName} ${b.lastName}`.toLowerCase()
          );
        case "username":
          return by((a.username ?? "").toLowerCase(), (b.username ?? "").toLowerCase());
        case "role":
          return by((a.role?.name ?? "").toLowerCase(), (b.role?.name ?? "").toLowerCase());
        case "active":
          return by(Boolean(a.isActive), Boolean(b.isActive));
        case "createdAt":
        default:
          return by(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime());
      }
    });
  }, [usersQuery.data, sortKey, sortDir]);

  const [suggestOpen, setSuggestOpen] = useState(false);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (usersQuery.data ?? [])
      .filter((u) => {
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim().toLowerCase();
        return (
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          fullName.includes(q) ||
          (u.role?.name ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [usersQuery.data, search]);

  const handleOpenDelete = (u: UserRes) => {
    setSelectedUser(u);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    await deleteUserMutation.mutateAsync(selectedUser.id);
    setOpenDelete(false);
    setSelectedUser(null);
  };

  const busy = usersQuery.isLoading || deleteUserMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          User Management
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/dashboard/admin/users/new")}
        >
          Add New User
        </Button>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Box ref={searchBoxRef}>
              <TextField
                label="Search users"
                placeholder="Search by name, username, email, role"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => {
                  if (search.trim()) setSuggestOpen(true);
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
                      {searchSuggestions.map((u) => (
                        <ListItemButton
                          key={u.id}
                          onClick={() => {
                            setSuggestOpen(false);
                            navigate(`/dashboard/admin/users/${u.id}`);
                          }}
                        >
                          <Avatar sx={{ width: 28, height: 28, mr: 1 }}>
                            {(u.firstName?.[0] ?? "U").toUpperCase()}
                          </Avatar>
                          <ListItemText
                            primary={`${u.firstName} ${u.lastName} • ${u.username}`}
                            secondary={u.email ?? u.role?.name}
                          />
                          <Chip size="small" label={u.role?.name ?? "—"} />
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
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="createdAt">Created date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="username">Username</MenuItem>
                <MenuItem value="role">Role</MenuItem>
                <MenuItem value="active">Active</MenuItem>
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

            {usersQuery.isError && <Alert severity="error">Failed to load users.</Alert>}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {usersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>Loading...</TableCell>
                    </TableRow>
                  ) : viewUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No users found.</TableCell>
                    </TableRow>
                  ) : (
                    viewUsers.map((u) => {
                      const editAllowed = canEditUser(u);
                      const deleteAllowed = canDeleteUser(u);

                      const eReason = editReason(u);
                      const dReason = deleteReason(u);

                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            {u.firstName} {u.lastName}
                          </TableCell>
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{u.email ?? "N/A"}</TableCell>
                          <TableCell>
                            <Chip size="small" label={u.role?.name ?? "N/A"} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={u.isActive ? "success" : "default"}
                              label={u.isActive ? "ACTIVE" : "INACTIVE"}
                            />
                          </TableCell>
                          <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>

                          <TableCell align="right">
                            <Tooltip title="View details">
                              <IconButton onClick={() => navigate(`/dashboard/admin/users/${u.id}`)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={editAllowed ? "Edit" : eReason}>
                              <span>
                                <IconButton
                                  disabled={!editAllowed}
                                  onClick={() => navigate(`/dashboard/admin/users/${u.id}/edit`)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title={deleteAllowed ? "Delete" : dReason}>
                              <span>
                                <IconButton
                                  color="error"
                                  disabled={!deleteAllowed}
                                  onClick={() => handleOpenDelete(u)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
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

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete{" "}
            <b>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "this user"}</b>?
          </Typography>

          {selectedUser && !canDeleteUser(selectedUser) && (
            <Alert sx={{ mt: 2 }} severity="warning">
              {deleteReason(selectedUser)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={busy || !selectedUser || !canDeleteUser(selectedUser)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
