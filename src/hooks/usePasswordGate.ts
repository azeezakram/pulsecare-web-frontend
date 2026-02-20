import { useCallback, useState } from "react";
import { useVerifyByPassword } from "../features/auth/auth-service";

type GateState = {
  open: boolean;
  title: string;
  description: string;
  error: string | null;
  busy: boolean;
};

export function usePasswordGate(username?: string | null) {
  const verifyMutation = useVerifyByPassword();

  const [state, setState] = useState<GateState>({
    open: false,
    title: "Confirm Password",
    description: "Please enter your password to continue.",
    error: null,
    busy: false,
  });

  const [pendingAction, setPendingAction] = useState<null | ((pwd: string) => Promise<void>)>(null);

  const askPasswordThen = useCallback(
    async (opts: { title: string; description: string; action: () => Promise<void> }) => {
      setPendingAction(() => async (pwd: string) => {
        setState((s) => ({ ...s, busy: true, error: null }));

        try {
          const user = (username ?? "").trim();
          if (!user) {
            setState((s) => ({
              ...s,
              busy: false,
              error: "Missing current username. Please login again.",
            }));
            return;
          }

          const ok = await verifyMutation.mutateAsync({ username: user, password: pwd });

          if (!ok) {
            setState((s) => ({ ...s, busy: false, error: "Incorrect password. Try again." }));
            return;
          }

          await opts.action();

          setState((s) => ({ ...s, busy: false, error: null, open: false }));
          setPendingAction(null);
        } catch (err) {
          console.error("verifyByPassword failed:", err);
          setState((s) => ({
            ...s,
            busy: false,
            error: "Password verification failed. Please try again.",
          }));
        }
      });

      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        error: null,
        busy: false,
      });
    },
    [username, verifyMutation]
  );

  const close = useCallback(() => {
    if (state.busy) return;
    setState((s) => ({ ...s, open: false, error: null }));
    setPendingAction(null);
  }, [state.busy]);

  const confirm = useCallback(
    async (pwd: string) => {
      if (!pendingAction) return;
      await pendingAction(pwd);
    },
    [pendingAction]
  );

  return { gate: state, askPasswordThen, close, confirm };
}
