const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Helper to get stored auth token
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gympass_token');
  }
  return null;
}

// Helper to set stored auth token
export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gympass_token', token);
  }
}

// Helper to clear token
export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gympass_token');
  }
}

// Helper to check if onboarding is complete
export function isOnboarded(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gympass_onboarded') === 'true';
  }
  return false;
}

// Fetch wrapper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// User endpoints
export const userApi = {
  sendOTP: (phone: string) => 
    request<{ message: string; otp_dev_bypass?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOTP: (phone: string, idToken?: string, otp?: string) => 
    request<{ token: string; is_onboarded: boolean; user: any; role?: string; admin_email?: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, id_token: idToken, otp }),
    }),

  onboard: (name: string, age: number, gender: string) => 
    request<any>('/user/onboard', {
      method: 'POST',
      body: JSON.stringify({ name, age, gender }),
    }),

  getDashboard: () => 
    request<any>('/user/dashboard', {
      method: 'GET',
    }),

  getQRToken: () => 
    request<{ token: string; expires_in: number }>('/user/qr', {
      method: 'GET',
    }),

  getPlans: () => 
    request<any[]>('/user/plans', {
      method: 'GET',
    }),

  initiatePayment: (planId: number, hours?: number) => 
    request<{ razorpay_order_id: string; amount: number; currency: string; key: string; plan_name: string }>('/user/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, hours }),
    }),

  verifyPayment: (orderId: string, paymentId: string, signature: string) => 
    request<any>('/user/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    }),
};

// Admin endpoints
export const adminApi = {
  login: (email: string, password: string) => 
    request<{ token: string; admin: any }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getDashboardStats: () => 
    request<any>('/admin/dashboard', {
      method: 'GET',
    }),

  listUsers: (query = '') => 
    request<any[]>(`/admin/users?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    }),

  getUserDetails: (id: number) => 
    request<any>(`/admin/users/${id}`, {
      method: 'GET',
    }),

  suspendUser: (id: number) => 
    request<{ message: string }>(`/admin/users/${id}/suspend`, {
      method: 'POST',
    }),

  activateUser: (id: number) => 
    request<{ message: string }>(`/admin/users/${id}/activate`, {
      method: 'POST',
    }),

  getPlans: () => 
    request<any[]>('/admin/plans', {
      method: 'GET',
    }),

  createPlan: (plan: any) => 
    request<any>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    }),

  updatePlan: (id: number, plan: any) => 
    request<any>(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    }),

  deletePlan: (id: number) => 
    request<{ message: string }>(`/admin/plans/${id}`, {
      method: 'DELETE',
    }),

  getSettings: () => 
    request<any>('/admin/settings', {
      method: 'GET',
    }),

  updateSettings: (settings: any) => 
    request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  listPayments: () => 
    request<any[]>('/admin/payments', {
      method: 'GET',
    }),

  listSessions: () => 
    request<any[]>('/admin/sessions', {
      method: 'GET',
    }),
};

// Scanner endpoint (hardware simulation)
export const scannerApi = {
  scan: (token: string) => 
    request<any>('/scanner/scan', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};
