import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Chip,
    Divider,
    Button,
    Alert,
    Avatar,
    Grid,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useUserById, useUserProfilePicture } from "../../../features/user/user-service";
import { useDoctorDetailByUserId } from "../../../features/doctor-detail/doctor-detail-service";

export default function AdminUserDetailsPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const userQuery = useUserById(id || "");
    const shouldFetchImage = Boolean(id && userQuery.data?.imageUrl);
    const imgQuery = useUserProfilePicture(id || "", { enabled: shouldFetchImage });


    const isDoctor = userQuery.data?.role?.name?.toUpperCase().includes("DOCTOR") ?? false;

    const docQuery = useDoctorDetailByUserId(id || "", {
        enabled: Boolean(id && isDoctor),
    });

    if (!id) return <Alert severity="error">Missing user id</Alert>;
    if (userQuery.isLoading) return <div>Loading...</div>;
    if (userQuery.isError) return <Alert severity="error">Failed to load user details</Alert>;

    const u = userQuery.data;

    if (u == undefined || u == null) {
        return <>
            404 User not found
        </>
    }


    const fullName = `${u.firstName} ${u.lastName}`.trim();
    const statusChip = u.isActive ? (
        <Chip color="success" size="small" label="ACTIVE" />
    ) : (
        <Chip color="default" size="small" label="INACTIVE" />
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs by NAME not ID */}
            {/* <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate("/dashboard/admin/users")}
          sx={{ cursor: "pointer" }}
        >
          Users
        </Link>
        <Typography color="text.primary">{fullName || u.username}</Typography>
      </Breadcrumbs> */}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={800}>
                    {fullName || "User Details"}
                </Typography>
                <Button variant="outlined" onClick={() => navigate("/dashboard/admin/users")}>
                    Back
                </Button>
            </Stack>

            {/* Top Profile Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
                        <Avatar
                            src={imgQuery.data || undefined}
                            sx={{ width: 110, height: 110 }}
                        >
                            {(u.firstName?.[0] ?? u.username?.[0] ?? "U").toUpperCase()}
                        </Avatar>

                        <Box sx={{ flex: 1 }}>
                            <Stack spacing={0.6}>
                                <Typography variant="h6" fontWeight={800}>
                                    {fullName} • <span style={{ fontWeight: 500 }}>{u.username}</span>
                                </Typography>

                                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                    <Chip size="small" label={u.role?.name ?? "N/A"} />
                                    {statusChip}
                                    {u.lastLoginAt && (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`Last login: ${new Date(u.lastLoginAt).toLocaleString()}`}
                                        />
                                    )}
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    Created: {new Date(u.createdAt).toLocaleString()} • Updated:{"N/A"}
                                    {new Date(u.updatedAt).toLocaleString()}
                                </Typography>
                            </Stack>
                        </Box>

                        <Button
                            variant="contained"
                            onClick={() => navigate(`/dashboard/admin/users/${u.id}/edit`)}
                            sx={{ textTransform: "none" }}
                        >
                            Edit User
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Details Sections */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography fontWeight={800} sx={{ mb: 1 }}>
                                Contact Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={1}>
                                <Typography><b>Email:</b> {u.email ?? "N/A"}</Typography>
                                <Typography><b>Mobile:</b> {u.mobileNumber ?? "N/A"}</Typography>
                                <Typography><b>User ID:</b> {u.id}</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography fontWeight={800} sx={{ mb: 1 }}>
                                Account & Security
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={1}>
                                <Typography><b>Role:</b> {u.role?.name ?? "N/A"}</Typography>
                                <Typography><b>Status:</b> {u.isActive ? "Active" : "Inactive"}</Typography>
                                <Typography><b>Last Login:</b> {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "N/A"}</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {isDoctor && (
                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <CardContent>
                                <Typography fontWeight={800} sx={{ mb: 1 }}>
                                    Medical Details (Doctor)
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                {docQuery.isLoading ? (
                                    <Typography color="text.secondary">Loading doctor details...</Typography>
                                ) : docQuery.isError ? (
                                    <Alert severity="info">No doctor details found for this user.</Alert>
                                ) : (
                                    <Stack spacing={1}>
                                        <Typography><b>License No:</b> {docQuery.data?.licenseNo ?? "N/A"}</Typography>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                            <Typography fontWeight={700}>Specializations:</Typography>
                                            {(docQuery.data?.specializations ?? []).length ? (
                                                docQuery.data!.specializations!.map((s) => (
                                                    <Chip key={s.id} size="small" label={s.name} />
                                                ))
                                            ) : (
                                                <Typography color="text.secondary">—</Typography>
                                            )}
                                        </Stack>
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
