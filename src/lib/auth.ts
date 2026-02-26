import { supabase } from "./supabase";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_SECRET;

async function callEdgeFunction(fnName: string, body: object) {
  try {
    await fetch(`${SUPABASE_FUNCTIONS_URL}/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`Edge function ${fnName} failed:`, err);
  }
}

export async function signUp(
  email: string,
  password: string,
  phone: string,
  name: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) return { data, error };

  if (data.user) {
    // Update profile with phone, email and name
    await supabase
      .from("user_profiles")
      .update({ phone, email, name })
      .eq("id", data.user.id);

    // Marked this signout as "pending approval" so the UI shows the right message
    localStorage.setItem("auth:signout_reason", "pending_approval");

    // Sign out immediately — user must wait for admin approval before logging in
    await supabase.auth.signOut();

    // Fire notifications after signout (non-blocking)
    callEdgeFunction("notify-admin-new-user", { record: { id: data.user.id } });
    callEdgeFunction("notify-user-signup-received", {
      record: { id: data.user.id },
    });
  }

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { data, error };

  // Check approval status
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_approved")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: {
        message:
          "Your account is pending approval. Please wait for the admin to approve your access.",
      },
    };
  }

  if (!profile.is_approved) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: {
        message:
          "Your account is pending approval. Please wait for the admin to approve your access.",
      },
    };
  }

  return { data, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  localStorage.clear();
  return { error };
}

export async function getCurrentUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return null;

  return user;
}

export function onAuthStateChange(
  callback: (event: string, session: any) => void,
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
