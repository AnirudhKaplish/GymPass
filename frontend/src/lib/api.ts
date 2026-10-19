export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/** Uploaded gym photos are served from the API host (without the /api suffix). */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return BASE_URL.replace(/\/api\/?$/, '') + path;
}

// ---------- Types ----------

export type PlanType = 'hourly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export interface GymPhoto { id: number; gym_id: number; url: string }

export interface Plan {
  id: number;
  gym_id: number;
  name: string;
  type: PlanType;
  price: number;
  validity_days: number;
  description: string;
  status: string;
  is_visible: boolean;
}

export interface Gym {
  id: number;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  opening_time: string;
  closing_time: string;
  timezone: string;
  status: string;
  photos: GymPhoto[];
  plans?: Plan[];
  distance_km?: number;
}

export interface Membership {
  id: number;
  gym_id: number;
  plan_id: number;
  plan_name: string;
  plan_type: PlanType;
  status: 'active' | 'expired';
  start_date: string;
  end_date: string | null;
  total_seconds: number;
  remaining_seconds: number;
  gym_name?: string;
  gym_address?: string;
  gym_city?: string;
  gym_latitude?: number;
  gym_longitude?: number;
  user_name?: string;
  user_phone?: string;
}

export interface Payment {
  id: number;
  user_id: number;
  gym_id: number;
  plan_id: number;
  plan_name: string;
  plan_type: PlanType;
  method: 'online' | 'cash';
  amount: number;
  hours: number;
  status: 'pending' | 'success' | 'failed' | 'rejected' | 'cancelled';
  created_at: string;
  resolved_at: string | null;
  user_name?: string;
  user_phone?: string;
  gym_name?: string;
}

export interface Visit {
  id: number;
  user_id: number;
  gym_id: number;
  membership_id: number;
  entry_time: string;
  exit_time: string | null;
  duration_seconds: number | null;
  hours_deducted: number | null;
  status: 'active' | 'completed' | 'auto_closed';
  user_name?: string;
  user_phone?: string;
  gym_name?: string;
  plan_name?: string;
  plan_type?: PlanType;
}

export interface AppNotification {
  id: number;
  gym_id: number;
  membership_id: number;
  kind: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UserDashboard {
  user: { id: number; name?: string | null; phone: string; age?: number | null; gender?: string | null };
  memberships: Membership[];
  pending_requests: Payment[];
  active_session: Visit | null;
  sessions: Visit[];
  unread_notifications: number;
}

export interface OwnerDashboard {
  gym: Gym;
  on_floor_now: number;
  on_floor: { id: number; user_name: string; user_phone: string; plan_name: string; plan_type: PlanType; entry_time: string; minutes_inside: number }[];
  today_entries: number;
  active_members: number;
  total_members: number;
  expiring_soon: number;
  revenue_today: number;
  revenue_month: number;
  pending_requests: number;
  hourly: { hour: number; today: number; avg_30d: number }[];
  recent_sessions: Visit[];
  recent_payments: Payment[];
  timezone: string;
}

export interface ScanResult {
  type: 'check_in' | 'check_out';
  message: string;
  user_name: string;
  plan_name?: string;
  plan_type?: PlanType;
  remaining?: string;
  time?: string;
  valid_until?: string;
  entry_time?: string;
  exit_time?: string;
  duration?: string;
  hours_deducted?: string;
}

export interface GymInput {
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  opening_time: string;
  closing_time: string;
  status?: string;
}

export interface PlanInput {
  name: string;
  type: PlanType;
  price: number;
  validity_days: number;
  description: string;
  status?: string;
  is_visible?: boolean;
}

// ---------- Auth storage ----------

const TOKEN_KEY = 'gympass_token';
const ROLE_KEY = 'gympass_role';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): 'user' | 'owner' | null {
  if (typeof window === 'undefined') return null;
  const r = localStorage.getItem(ROLE_KEY);
  return r === 'user' || r === 'owner' ? r : null;
}

export function setAuth(token: string, role: 'user' | 'owner') {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem('gympass_phone');
  localStorage.removeItem('gympass_onboarded');
  localStorage.removeItem('gympass_active_gym');
}

export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gympass_onboarded') === 'true';
}

// ---------- Fetch wrapper ----------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    // A saved login that the server no longer accepts: sign out and go to the right login page.
    if (response.status === 401 && token && typeof window !== 'undefined' && !path.startsWith('/auth/') && !path.startsWith('/owner/login') && !path.startsWith('/owner/register')) {
      const wasOwner = getRole() === 'owner';
      clearAuthToken();
      window.location.href = wasOwner ? '/owner/login' : '/auth';
    }
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || `Request failed (${response.status})`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** True when a failed request means the saved login is no longer valid. */
export function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401;
}

function geoQuery(params: { lat?: number; lng?: number; q?: string; radius_km?: number }) {
  const sp = new URLSearchParams();
  if (params.lat !== undefined && params.lng !== undefined) {
    sp.set('lat', String(params.lat));
    sp.set('lng', String(params.lng));
  }
  if (params.q) sp.set('q', params.q);
  if (params.radius_km) sp.set('radius_km', String(params.radius_km));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---------- Member API ----------

export const userApi = {
  sendOTP: (phone: string) =>
    request<{ message: string; otp_dev_bypass?: string }>('/auth/send-otp', json('POST', { phone })),

  verifyOTP: (phone: string, idToken?: string, otp?: string) =>
    request<{ token: string; is_onboarded: boolean; user: UserDashboard['user']; role: string }>(
      '/auth/verify-otp',
      json('POST', { phone, id_token: idToken, otp })
    ),

  onboard: (name: string, age: number, gender: string) =>
    request<{ user: UserDashboard['user'] }>('/user/onboard', json('POST', { name, age, gender })),

  getDashboard: () => request<UserDashboard>('/user/dashboard'),

  getQRToken: () => request<{ token: string; expires_in: number }>('/user/qr'),

  listGyms: (params: { lat?: number; lng?: number; q?: string; radius_km?: number } = {}) =>
    request<Gym[]>(`/user/gyms${geoQuery(params)}`),

  getGym: (id: number, coords?: { lat: number; lng: number }) =>
    request<{ gym: Gym; my_memberships: Membership[]; pending_requests: Payment[] }>(
      `/user/gyms/${id}${geoQuery(coords ?? {})}`
    ),

  initiatePayment: (planId: number, hours?: number) =>
    request<{ razorpay_order_id: string; amount: number; currency: string; key: string; plan_name: string; gym_name: string }>(
      '/user/payments/initiate',
      json('POST', { plan_id: planId, hours })
    ),

  verifyPayment: (orderId: string, paymentId: string, signature: string) =>
    request<{ message: string; membership: Membership }>(
      '/user/payments/verify',
      json('POST', {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      })
    ),

  requestCash: (planId: number, hours?: number) =>
    request<{ message: string; request: Payment }>('/user/memberships/cash-request', json('POST', { plan_id: planId, hours })),

  cancelRequest: (id: number) => request<{ message: string }>(`/user/requests/${id}/cancel`, json('POST')),

  getNotifications: () => request<{ notifications: AppNotification[]; unread: number }>('/user/notifications'),

  markNotificationsRead: (ids: number[] = []) =>
    request<{ message: string }>('/user/notifications/read', json('POST', { ids })),
};

// ---------- Owner API ----------

export const ownerApi = {
  login: (email: string, password: string) =>
    request<{ token: string; owner: { id: number; name: string; email: string } }>('/owner/login', json('POST', { email, password })),

  register: (name: string, email: string, phone: string, password: string) =>
    request<{ token: string; owner: { id: number; name: string; email: string } }>(
      '/owner/register',
      json('POST', { name, email, phone, password })
    ),

  me: () => request<{ id: number; name: string; email: string; phone: string }>('/owner/me'),

  listGyms: () => request<Gym[]>('/owner/gyms'),
  getGym: (id: number) => request<Gym>(`/owner/gyms/${id}`),
  createGym: (g: GymInput) => request<Gym>('/owner/gyms', json('POST', g)),
  updateGym: (id: number, g: GymInput) => request<Gym>(`/owner/gyms/${id}`, json('PUT', g)),

  uploadPhotos: (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    return request<GymPhoto[]>(`/owner/gyms/${id}/photos`, { method: 'POST', body: form });
  },
  deletePhoto: (gymId: number, photoId: number) =>
    request<{ message: string }>(`/owner/gyms/${gymId}/photos/${photoId}`, json('DELETE')),

  listPlans: (gymId: number) => request<Plan[]>(`/owner/gyms/${gymId}/plans`),
  createPlan: (gymId: number, p: PlanInput) => request<Plan>(`/owner/gyms/${gymId}/plans`, json('POST', p)),
  updatePlan: (planId: number, p: PlanInput) => request<Plan>(`/owner/plans/${planId}`, json('PUT', p)),
  deletePlan: (planId: number) => request<{ message: string }>(`/owner/plans/${planId}`, json('DELETE')),

  dashboard: (gymId: number) => request<OwnerDashboard>(`/owner/gyms/${gymId}/dashboard`),
  addMember: (gymId: number, m: { phone: string; name: string; plan_id: number; hours?: number }) =>
    request<{ message: string; membership: Membership }>(`/owner/gyms/${gymId}/members`, json('POST', m)),
  checkoutSession: (sessionId: number) =>
    request<{ message: string; duration: string; hours_deducted?: string }>(`/owner/sessions/${sessionId}/checkout`, json('POST')),
  members: (gymId: number, status = '') =>
    request<Membership[]>(`/owner/gyms/${gymId}/members${status ? `?status=${status}` : ''}`),
  sessions: (gymId: number) => request<Visit[]>(`/owner/gyms/${gymId}/sessions`),
  payments: (gymId: number) => request<Payment[]>(`/owner/gyms/${gymId}/payments`),
  requests: (gymId: number) => request<Payment[]>(`/owner/gyms/${gymId}/requests`),
  approveRequest: (id: number) =>
    request<{ message: string; membership: Membership }>(`/owner/requests/${id}/approve`, json('POST')),
  rejectRequest: (id: number) => request<{ message: string }>(`/owner/requests/${id}/reject`, json('POST')),

  scan: (gymId: number, token: string) =>
    request<ScanResult>(`/owner/gyms/${gymId}/scan`, json('POST', { token })),
};
