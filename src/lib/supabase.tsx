import { createClient } from "@supabase/supabase-js";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --------------------
// Dialog renderer
// --------------------
function showAuthDialog(title: string, description: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  function Modal() {
    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
      setOpen(false);
      setTimeout(() => {
        root.unmount();
        container.remove();
        window.location.href = "/login";
      }, 150);
    };

    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  root.render(<Modal />);
}

// --------------------
// Helpers
// --------------------
function isOnPublicRoute() {
  return (
    window.location.pathname === "/" || window.location.pathname === "/login"
  );
}

function redirectToLogin() {
  if (!isOnPublicRoute()) {
    window.location.href = "/login";
  }
}

// --------------------
// Initial session check
// --------------------
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session && !isOnPublicRoute()) {
    showAuthDialog(
      "Session expired",
      "Your session has expired. Please log in again to continue.",
    );
  }
});

// --------------------
// Auth state changes
// --------------------
supabase.auth.onAuthStateChange((event, session) => {
  if (!session && !isOnPublicRoute()) {
    if (event === "SIGNED_OUT") {
      const reason = localStorage.getItem("auth:signout_reason");

      if (reason === "pending_approval") {
        localStorage.removeItem("auth:signout_reason");
        showAuthDialog(
          "Account pending approval",
          "Your account has been created but is not yet activated. Please wait for admin approval before logging in.",
        );
        return;
      }

      // Manual logout → just redirect quietly
      redirectToLogin();
      return;
    }

    // Token expired / refresh failed
    showAuthDialog(
      "Session expired",
      "Your session has expired. Please log in again to continue.",
    );
  }
});
