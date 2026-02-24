import { supabase } from "./supabase";

export type Product = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string;
  reminder_date: string;
  quantity: number;
  category: string | null;
  status: string;
  added_by: string;
  created_at: string;
};

// ===== Helper: Calculate Days Until Expiry (DRY) =====
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ===== Calculate Reminder Date =====
export function calculateReminderDate(expiryDate: string): string {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (daysUntilExpiry <= 90) {
    return today.toISOString().split("T")[0];
  }

  const reminderDate = new Date(expiry);
  reminderDate.setDate(reminderDate.getDate() - 90);
  return reminderDate.toISOString().split("T")[0];
}

// ===== Get Product Status =====
export function getProductStatus(expiryDate: string): string {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 90) return "expiring_soon";
  return "safe";
}

// ===== Get All Products =====
export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("expiry_date", { ascending: true });

  if (error) throw error;

  return (data || []) as Product[];
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
}

// ===== Check for Duplicate Product =====
async function checkDuplicateProduct(
  name: string,
  expiryDate: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("name", name.trim())
    .eq("expiry_date", expiryDate)
    .eq("added_by", userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ===== Add Product =====
export async function addProduct(product: {
  name: string;
  expiry_date: string;
  photo_url?: string | null;
  quantity?: number;
  category?: string | null;
}) {
  if (!product.name || !product.name.trim()) {
    throw new Error("Product name is required");
  }

  const expiryDate = new Date(product.expiry_date);
  if (isNaN(expiryDate.getTime())) {
    throw new Error("Invalid expiry date");
  }

  const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
  let warningMessage: string | null = null;

  if (daysUntilExpiry < 0) {
    warningMessage = `⚠️ Warning: This product already expired ${Math.abs(daysUntilExpiry)} day(s) ago.`;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isDuplicate = await checkDuplicateProduct(
    product.name,
    product.expiry_date,
    user.id,
  );

  if (isDuplicate) {
    throw new Error(
      `Duplicate product: "${product.name}" expiring on ${product.expiry_date} already exists.`,
    );
  }

  const reminderDate = calculateReminderDate(product.expiry_date);
  const status = getProductStatus(product.expiry_date);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: product.name.trim(),
      expiry_date: product.expiry_date,
      photo_url: product.photo_url || null,
      quantity: product.quantity || 1,
      category: product.category?.trim() || null,
      reminder_date: reminderDate,
      status,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    product: data as Product,
    warning: warningMessage,
  };
}

// ===== Get Product By ID =====
export async function getProductById(productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) throw error;

  return data as Product;
}

export async function updateProduct(
  productId: string,
  updates: {
    name: string;
    expiry_date: string;
    quantity: number;
    category: string | null;
    photo_url?: string | null;
  },
) {
  if (!updates.name || !updates.name.trim()) {
    throw new Error("Product name is required");
  }

  const expiryDate = new Date(updates.expiry_date);
  if (isNaN(expiryDate.getTime())) {
    throw new Error("Invalid expiry date");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const reminderDate = calculateReminderDate(updates.expiry_date);
  const status = getProductStatus(updates.expiry_date);

  const payload: any = {
    name: updates.name.trim(),
    expiry_date: updates.expiry_date,
    quantity: updates.quantity,
    category: updates.category?.trim() || null,
    reminder_date: reminderDate,
    status,
  };

  // Only update image if user actually changed it
  if (updates.photo_url !== undefined) {
    payload.photo_url = updates.photo_url;
  }

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;

  return data as Product;
}
