import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button, Stack, Divider } from "@mui/material";
import { useAuthStore } from "../../store/auth-store";
import defaltProfile from "../../assets/static/logo/defult-profile.jpg";
import { useUserProfilePicture } from "../../features/user/user-service";

export default function NurseSettingPage() {
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const profileImage = useUserProfilePicture(user?.id || "");

  if (!user) return <div>Loading...</div>;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box>
              <img
                src={profileImage.data || defaltProfile}
                alt={user.firstName + " " + user.lastName}
                style={{ width: 150, height: 150, borderRadius: "50%" }}
              />
            </Box>
            <Box>
              <Typography variant="h6">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Username:</strong> {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {user.email || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Mobile Number:</strong> {user.mobileNumber || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Last Login:</strong>{" "}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Account Created:</strong>{" "}
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </Typography>

              <div className="bg-blue-500 w-fit px-2 rounded-2xl mt-3 flex items-center gap-1 cursor-pointer">
                <span>{"\u2022"}</span>
                <Typography sx={{ fontSize: 11, fontWeight: "bold" }} variant="body2" color="text.secondary">
                  {user.role.name.toUpperCase()}
                </Typography>
              </div>
            </Box>
            <Box alignItems="baseline">
              <Button
                variant="text"
                sx={{ textTransform: "none" }}
                onClick={() => navigate("/dashboard/nurse/settings/profile")}
              >
                Edit Profile
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Other Settings
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Button
              variant="outlined"
              color="error"
              sx={{ textTransform: "none" }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}