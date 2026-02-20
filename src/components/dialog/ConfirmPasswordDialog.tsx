import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
};

export default function ConfirmPasswordDialog({
  open,
  title = "Confirm Password",
  description = "Please enter your password to continue.",
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    function set() {
      setPassword("");
      setShowPwd(false);
    }
    if (!open) {
      set()
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus
            label="Password"
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            onKeyDown={(e) => {
              if (e.key === "Enter" && password.trim() && !busy) onConfirm(password);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPwd((s) => !s)}
                    disabled={busy}
                    aria-label={showPwd ? "hide password" : "show password"}
                  >
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small" variant="outlined" disabled={busy} sx={{borderRadius:5, borderColor:"white", color:"white"}}>
          Cancel
        </Button>
        <Button size="small" onClick={() => onConfirm(password)} variant="contained" disabled={busy || !password.trim()} sx={{borderRadius:5, backgroundColor:"white"}}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
