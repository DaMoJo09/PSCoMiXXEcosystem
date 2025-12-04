import type { User, Project, Asset, InsertUser, InsertProject, InsertAsset } from "@shared/schema";

const API_BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(error.message || "Request failed");
  }
  return response.json();
}

export const authApi = {
  signup: async (data: InsertUser) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse<{ id: string; email: string; name: string; role: string }>(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    return handleResponse<{ id: string; email: string; name: string; role: string }>(response);
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
    return handleResponse<{ id: string; email: string; name: string; role: string }>(response);
  },
  
  adminLogin: async (password: string) => {
    const response = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    });
    return handleResponse<{ id: string; email: string; name: string; role: string }>(response);
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
