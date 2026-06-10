// API client for Cloudflare Worker backend
const API_BASE = 'https://ironlog-worker.hhhhala7777777.workers.dev';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Unknown error');
  }
  return json.data!;
}

// User API
export const userApi = {
  get: (userId: string) => request(`/api/user/${userId}`),
  save: (user: Record<string, unknown>) => request('/api/user', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
};

// Plans API
export const plansApi = {
  list: (userId: string) => request(`/api/plans?userId=${userId}`),
  save: (plan: Record<string, unknown>) => request('/api/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  }),
  delete: (id: number) => request(`/api/plans/${id}`, { method: 'DELETE' }),
};

// Records API
export const recordsApi = {
  list: (userId: string) => request(`/api/records?userId=${userId}`),
  save: (record: Record<string, unknown>) => request('/api/records', {
    method: 'POST',
    body: JSON.stringify(record),
  }),
  delete: (id: number) => request(`/api/records/${id}`, { method: 'DELETE' }),
};

// Sync API
export const syncApi = {
  fullSync: (data: Record<string, unknown>) => request('/api/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// AI API (via Worker proxy)
export const aiApi = {
  chat: (messages: Array<{ role: string; content: string }>, userProfile?: Record<string, unknown>) =>
    request<{ content: string; planData?: Record<string, unknown> }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, userProfile }),
    }),
};

export default { userApi, plansApi, recordsApi, syncApi, aiApi };
