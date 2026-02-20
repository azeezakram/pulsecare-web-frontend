import { Card, CardContent, Stack, Typography } from "@mui/material";
import { Box } from "lucide-react";

export default function BarList({ title, items }: { title: string; items: { label: string; value: number }[] }) {
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