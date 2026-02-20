/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
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
  Button,
  Popper,
  ClickAwayListener,
  Grid,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { useAllWards } from "../../features/ward/ward-service";
import { useAllBeds } from "../../features/bed/bed-service";


import type { DeptRes } from "../../features/department/types";
import type { WardRes } from "../../features/ward/types";
import type { BedRes } from "../../features/bed/types";

import { useAllDepartments } from "../../features/department/department-service";
import { useWardsByDepartmentId } from "../../features/ward/ward-service";
import { useBedsByWardId } from "../../features/bed/bed-service";


type SortDir = "asc" | "desc";
type DeptSortKey = "name" | "createdAt";
type WardSortKey = "name" | "bedCount" | "occupiedBeds" | "createdAt";
type BedSortKey = "bedNo" | "isTaken" | "createdAt";

function BarList({ title, items }: { title: string; items: { label: string; value: number }[] }) {
    const max = Math.max(1, ...items.map(i => i.value));
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={800} sx={{ mb: 1 }}>{title}</Typography>
          <Stack spacing={1}>
            {items.map((i) => (
              <Box key={i.label}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{i.label}</Typography>
                  <Typography variant="body2" fontWeight={700}>{i.value}</Typography>
                </Stack>
                <Box sx={{ height: 8, bgcolor: "rgba(0,0,0,0.08)", mt: 0.5 }}>
                  <Box sx={{ height: 8, width: `${(i.value / max) * 100}%`, bgcolor: "#03a8dd" }} />
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

export default function NurseDepartmentPage() {
  const deptsQuery = useAllDepartments();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<DeptSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const [openView, setOpenView] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DeptRes | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardRes | null>(null);

  const wardsQuery = useWardsByDepartmentId(selectedDept?.id);
  const bedsQuery = useBedsByWardId(selectedWard?.id);
  const wardsAllQuery = useAllWards();
  const bedsAllQuery = useAllBeds();

  const deptStats = useMemo(() => {
    const wards = wardsAllQuery.data ?? [];
    const beds = bedsAllQuery.data ?? [];

    // deptId -> wardIds
    const wardsByDept = new Map<number, WardRes[]>();
    for (const w of wards) {
      const did = (w.departmentId ?? 0) as number;
      if (!wardsByDept.has(did)) wardsByDept.set(did, []);
      wardsByDept.get(did)!.push(w);
    }

    // wardId -> beds
    const bedsByWard = new Map<number, BedRes[]>();
    for (const b of beds) {
      const wid = (b.wardId ?? 0) as number;
      if (!bedsByWard.has(wid)) bedsByWard.set(wid, []);
      bedsByWard.get(wid)!.push(b);
    }

    // deptId -> { wards, beds, occupied }
    const map = new Map<number, { wardCount: number; bedCount: number; occupied: number }>();

    for (const [deptId, deptWards] of wardsByDept.entries()) {
      let bedCount = 0;
      let occupied = 0;

      for (const w of deptWards) {
        const list = bedsByWard.get(w.id) ?? [];
        bedCount += list.length;
        occupied += list.filter((x) => Boolean(x.isTaken)).length; // 👈 from beds (more reliable)
      }

      map.set(deptId, { wardCount: deptWards.length, bedCount, occupied });
    }

    // global totals
    const totalDepartments = (deptsQuery.data ?? []).length;
    const totalWards = wards.length;
    const totalBeds = beds.length;
    const totalOccupiedBeds = beds.filter((b) => Boolean(b.isTaken)).length;

    return {
      byDept: map,
      totals: { totalDepartments, totalWards, totalBeds, totalOccupiedBeds },
    };
  }, [deptsQuery.data, wardsAllQuery.data, bedsAllQuery.data]);



  const [wardSortKey, setWardSortKey] = useState<WardSortKey>("createdAt");
  const [wardSortDir, setWardSortDir] = useState<SortDir>("desc");
  const [bedSortKey, setBedSortKey] = useState<BedSortKey>("createdAt");
  const [bedSortDir, setBedSortDir] = useState<SortDir>("desc");

  const viewWards = useMemo(() => {
    const list = wardsQuery.data ?? [];
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
  }, [wardsQuery.data, wardSortKey, wardSortDir]);

  const viewBeds = useMemo(() => {
    const list = bedsQuery.data ?? [];
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
  }, [bedsQuery.data, bedSortKey, bedSortDir]);

  const openDeptPopup = (d: DeptRes) => {
    setSelectedDept(d);
    setSelectedWard(null);
    setOpenView(true);
  };

  const closeDeptPopup = () => {
    setOpenView(false);
    setSelectedWard(null);
    setSelectedDept(null);
  };

  const busy =
    deptsQuery.isLoading ||
    wardsAllQuery.isLoading ||
    bedsAllQuery.isLoading ||
    wardsQuery.isLoading ||
    bedsQuery.isLoading;


  const admissionStats =
  {
    "totalAdmissions": 1200,
    "currentInPatients": 85,
    "admissionsToday": 12,
    "topDepartments": [{ "name": "Cardiology", "count": 220 }],
    "topWards": [{ "name": "Ward A", "count": 140 }],
    "occupancyTrend": [{ "date": "2026-02-01", "occupied": 70 }, { "date": "2026-02-02", "occupied": 78 }]
  }



  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Departments
        </Typography>

        <Chip label="NURSE VIEW" variant="outlined" />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarList
            title="Most Admitted Departments"
            items={(admissionStats?.topDepartments ?? []).map(x => ({ label: x.name, value: x.count }))}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarList
            title="Most Admitted Wards"
            items={(admissionStats?.topWards ?? []).map(x => ({ label: x.name, value: x.count }))}
          />
        </Grid>
      </Grid>


      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Departments</Typography>
              <Typography variant="h5" fontWeight={800}>{deptStats.totals.totalDepartments}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Wards</Typography>
              <Typography variant="h5" fontWeight={800}>{deptStats.totals.totalWards}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Beds</Typography>
              <Typography variant="h5" fontWeight={800}>{deptStats.totals.totalBeds}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Occupied Beds</Typography>
              <Typography variant="h5" fontWeight={800}>{deptStats.totals.totalOccupiedBeds}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


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
                            openDeptPopup(d);
                          }}
                        >
                          <ListItemText primary={`${d.name ?? "—"} • ID ${d.id}`} secondary={d.createdAt} />
                          <Chip size="small" label="VIEW" />
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

            {deptsQuery.isError && (
              <Alert severity="error">{deptsQuery.error?.message ?? "Failed to load departments."}</Alert>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Wards</TableCell>
                  <TableCell>Beds</TableCell>
                  <TableCell>Occupied</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>


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
                        <TableCell>{deptStats.byDept.get(d.id)?.wardCount ?? 0}</TableCell>
                        <TableCell>{deptStats.byDept.get(d.id)?.bedCount ?? 0}</TableCell>
                        <TableCell>{deptStats.byDept.get(d.id)?.occupied ?? 0}</TableCell>
                        <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View wards & beds">
                            <IconButton onClick={() => openDeptPopup(d)}>
                              <VisibilityIcon />
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

      <Dialog open={openView} onClose={closeDeptPopup} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack spacing={0.2}>
              <Typography fontWeight={800}>Department Details</Typography>
              <Typography variant="body2" color="text.secondary">
                View only (Nurse)
              </Typography>
            </Stack>
            {selectedDept && <Chip label={`ID ${selectedDept.id}`} />}
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {!selectedDept ? (
            <Alert severity="warning">No department selected.</Alert>
          ) : (
            <Stack spacing={2.5}>
              <Card sx={{backgroundColor: "#444"}}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography>
                        <b>Name:</b> {selectedDept.name ?? "—"}
                      </Typography>
                      <Typography>
                        <b>ID:</b> {selectedDept.id}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography>
                        <b>Created:</b> {new Date(selectedDept.createdAt).toLocaleString()}
                      </Typography>
                      <Typography>
                        <b>Updated:</b> {new Date(selectedDept.updatedAt).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{backgroundColor: "#444"}}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontWeight={800}>Wards</Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            label="Sort"
                            size="small"
                            value={wardSortKey}
                            onChange={(e) => setWardSortKey(e.target.value as WardSortKey)}
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="createdAt">Created</MenuItem>
                            <MenuItem value="name">Name</MenuItem>
                            <MenuItem value="bedCount">Bed count</MenuItem>
                            <MenuItem value="occupiedBeds">Occupied</MenuItem>
                          </TextField>

                          <Tooltip title={wardSortDir === "asc" ? "Ascending" : "Descending"}>
                            <IconButton onClick={() => setWardSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                              {wardSortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      {wardsQuery.isError && <Alert severity="error">Failed to load wards.</Alert>}

                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360, overflowY: "auto" }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Ward</TableCell>
                              <TableCell>Bed</TableCell>
                              <TableCell>Occ</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {wardsQuery.isLoading ? (
                              <TableRow>
                                <TableCell colSpan={3}>Loading...</TableCell>
                              </TableRow>
                            ) : viewWards.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3}>No wards.</TableCell>
                              </TableRow>
                            ) : (
                              viewWards.map((w) => (
                                <TableRow
                                  key={w.id}
                                  hover
                                  selected={selectedWard?.id === w.id}
                                  onClick={() => setSelectedWard(w)}
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
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Tip: Click a ward to view beds.
                        </Typography>
                        <ExpandMoreIcon fontSize="small" sx={{ opacity: 0.6 }} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{backgroundColor: "#444"}}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontWeight={800}>
                          Beds {selectedWard ? `• ${selectedWard.name ?? "—"}` : ""}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            label="Sort"
                            size="small"
                            value={bedSortKey}
                            onChange={(e) => setBedSortKey(e.target.value as BedSortKey)}
                            sx={{ minWidth: 140 }}
                            disabled={!selectedWard}
                          >
                            <MenuItem value="createdAt">Created</MenuItem>
                            <MenuItem value="bedNo">Bed no</MenuItem>
                            <MenuItem value="isTaken">Taken</MenuItem>
                          </TextField>

                          <Tooltip title={bedSortDir === "asc" ? "Ascending" : "Descending"}>
                            <span>
                              <IconButton
                                onClick={() => setBedSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                                disabled={!selectedWard}
                              >
                                {bedSortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      {!selectedWard ? (
                        <Alert severity="info">Select a ward to load beds.</Alert>
                      ) : bedsQuery.isError ? (
                        <Alert severity="error">Failed to load beds.</Alert>
                      ) : (
                        <TableContainer component={Paper} sx={{backgroundColor: "#444", maxHeight: 360, overflowY: "auto" }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Bed No</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {bedsQuery.isLoading ? (
                                <TableRow>
                                  <TableCell colSpan={3}>Loading...</TableCell>
                                </TableRow>
                              ) : viewBeds.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3}>No beds.</TableCell>
                                </TableRow>
                              ) : (
                                viewBeds.map((b: BedRes) => (
                                  <TableRow key={b.id} hover>
                                    <TableCell>{b.bedNo ?? "—"}</TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        color={b.isTaken ? "error" : "success"}
                                        label={b.isTaken ? "TAKEN" : "FREE"}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeptPopup} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}