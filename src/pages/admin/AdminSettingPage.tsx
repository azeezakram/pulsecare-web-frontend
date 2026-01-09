import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button, Stack, Divider } from "@mui/material";
import { useAuthStore } from "../../store/auth-store";
import defaltProfile from '../../assets/static/defult-profile.jpg';
import { useUserProfilePicture } from "../../features/user/user-service";

export default function AdminSettingPage() {
  const user = useAuthStore((s) => s.currentUser);
  const navigate = useNavigate();

  const profileImage = useUserProfilePicture(user?.id || "");

  if (!user) return <div>Loading...</div>;

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center" >
            <Box>
              <img
                src={profileImage.data || defaltProfile}
                alt={user.firstName + " " + user.lastName}
                style={{ width: 150, height: 150, borderRadius: "50%" }}
              />
            </Box>
            <Box>
              <Typography variant="h6">{user.firstName} {user.lastName}</Typography>
              <Typography variant="body2" color="text.secondary"><span className="font-bold">Username:</span> {user.username}</Typography>
              <Typography variant="body2" color="text.secondary"><span className="font-bold">Email:</span> {user.email ? user.email : 'N/A'}</Typography>
              <Typography variant="body2" color="text.secondary"><span className="font-bold">Mobile Number:</span> {user.mobileNumber ? user.mobileNumber : 'N/A'}</Typography>
              <Typography variant="body2" color="text.secondary">
                <span className="font-bold">Last Login:</span>{" "}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <span className="font-bold">Account Created:</span>{" "}
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
              <div className="bg-green-500 w-fit px-2 rounded-2xl mt-3 flex items-center gap-1 cursor-pointer">
                <span>{'\u2022'}</span>
                <Typography sx={{ fontSize: 11, fontWeight: 'bold' }} variant="body2" color="text.secondary">{user.role.name.toUpperCase()}</Typography>
              </div>
            </Box>
            <Box alignItems="baseline">
              <Button
                variant="text"
                sx={{ textTransform: "none" }}
                onClick={() => navigate("/dashboard/admin/settings/profile")}
              >
                Edit Profile
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Other Settings</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Button variant="outlined" sx={{ textTransform: "none" }}>Change Password</Button>
            {/* <Button variant="outlined" sx={{ textTransform: "none" }}>Manage Roles</Button> */}
            <Button variant="outlined" sx={{ textTransform: "none" }}>Deactivate Account</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
