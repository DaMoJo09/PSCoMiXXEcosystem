import type { User, Project, Asset, InsertUser, InsertProject, InsertAsset } from "@shared/schema";

const API_BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(error.message || "Request failed");
  }
  return response.json();
}

interface AuthResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  accountType: string;
  xp: number;
  level: number;
  totalMinutes: number;
}

export const authApi = {
  signup: async (data: { email: string; password: string; name: string; dateOfBirth: string }) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<AuthResponse>(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    return handleResponse<AuthResponse>(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<{ message: string }>(response);
  },

  me: async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
    });
    return handleResponse<AuthResponse>(response);
  },
  
  adminLogin: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    return handleResponse<AuthResponse>(response);
  },
  
  getLegalStatus: async () => {
    const response = await fetch(`${API_BASE}/auth/legal-status`, {
      credentials: "include",
    });
    return handleResponse<{ ipDisclosureAccepted: Date | null; userAgreementAccepted: Date | null }>(response);
  },
  
  acceptIpDisclosure: async () => {
    const response = await fetch(`${API_BASE}/auth/accept-ip-disclosure`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<{ ipDisclosureAccepted: Date | null; userAgreementAccepted: Date | null }>(response);
  },
  
  acceptUserAgreement: async () => {
    const response = await fetch(`${API_BASE}/auth/accept-user-agreement`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<{ ipDisclosureAccepted: Date | null; userAgreementAccepted: Date | null }>(response);
  },
};

export const projectsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/projects`, {
      credentials: "include",
    });
    return handleResponse<Project[]>(response);
  },

  getOne: async (id: string) => {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      credentials: "include",
    });
    return handleResponse<Project>(response);
  },

  create: async (data: Omit<InsertProject, "userId">) => {
    const response = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<Project>(response);
  },

  update: async (id: string, data: Partial<Omit<InsertProject, "userId">>) => {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<Project>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<{ message: string }>(response);
  },
};

export const assetsApi = {
  getAll: async (projectId?: string) => {
    const url = projectId
      ? `${API_BASE}/assets?projectId=${projectId}`
      : `${API_BASE}/assets`;
    const response = await fetch(url, {
      credentials: "include",
    });
    return handleResponse<Asset[]>(response);
  },

  create: async (data: Omit<InsertAsset, "userId">) => {
    const response = await fetch(`${API_BASE}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<Asset>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<{ message: string }>(response);
  },
};

export const adminApi = {
  getUsers: async () => {
    const response = await fetch(`${API_BASE}/admin/users`, {
      credentials: "include",
    });
    return handleResponse<Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: Date;
    }>>(response);
  },

  getProjects: async () => {
    const response = await fetch(`${API_BASE}/admin/projects`, {
      credentials: "include",
    });
    return handleResponse<Project[]>(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE}/admin/stats`, {
      credentials: "include",
    });
    return handleResponse<{
      totalUsers: number;
      totalProjects: number;
      projectsByType: { type: string; count: number }[];
    }>(response);
  },
};

export interface Announcement {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  eventType: string;
  isFeatured: boolean;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export const announcementsApi = {
  getActive: async (featuredOnly?: boolean) => {
    const url = featuredOnly 
      ? `${API_BASE}/announcements/active?featured=true` 
      : `${API_BASE}/announcements/active`;
    const response = await fetch(url);
    return handleResponse<Announcement[]>(response);
  },

  getAll: async (featuredOnly?: boolean) => {
    const url = featuredOnly 
      ? `${API_BASE}/announcements?featured=true` 
      : `${API_BASE}/announcements`;
    const response = await fetch(url, { credentials: "include" });
    return handleResponse<Announcement[]>(response);
  },

  getMine: async () => {
    const response = await fetch(`${API_BASE}/announcements/mine`, {
      credentials: "include",
    });
    return handleResponse<Announcement[]>(response);
  },

  getOne: async (id: string) => {
    const response = await fetch(`${API_BASE}/announcements/${id}`);
    return handleResponse<Announcement>(response);
  },

  create: async (data: Partial<Announcement>) => {
    const response = await fetch(`${API_BASE}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<Announcement>(response);
  },

  update: async (id: string, data: Partial<Announcement>) => {
    const response = await fetch(`${API_BASE}/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<Announcement>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/announcements/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<{ success: boolean }>(response);
  },
};
