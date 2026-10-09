import {
  MasterProfileDto,
  JobApplicationDto,
  TailoredResumeDto,
  JobAnalysisDto,
  ApplicationStatus,
  SupportedLanguage,
  PaginatedResult,
  JobApplicationFiltersDto,
} from "@tailored-cv/types";
import { CreateJobApplicationInput } from "@tailored-cv/validation";

const API_BASE_URL = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody.error?.message ||
      errorBody.message ||
      `HTTP error ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface UserSessionDto {
  title: string;
  name: string;
  username: string;
  email: string;
}

export const api = {
  login: (data: { email: string; password: string }) =>
    request<{
      title: string;
      user: { id: number; name: string; username: string; email: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<void>("/auth/logout", {
      method: "DELETE",
    }),
  getSession: () => request<UserSessionDto>("/auth/session"),

  getProfile: () => request<MasterProfileDto>("/profile"),
  updateProfile: (data: MasterProfileDto) =>
    request<MasterProfileDto>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  resetSeedProfile: () =>
    request<MasterProfileDto>("/profile/reset-seed", { method: "POST" }),
  generateEnglishProfile: () =>
    request<MasterProfileDto>("/profile/generate-english", { method: "POST" }),
  getEnglishProfile: () =>
    request<{
      englishCv: MasterProfileDto | null;
      englishCvUpdatedAt: string | null;
    }>("/profile/english"),

  getApplications: (params?: JobApplicationFiltersDto) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search?.trim()) query.set("search", params.search.trim());
    if (params?.status && (params.status as string) !== "ALL") {
      query.set("status", params.status);
    }
    if (params?.stack && params.stack !== "ALL") {
      query.set("stack", params.stack);
    }
    if (params?.sortBy) query.set("sortBy", params.sortBy);

    const queryString = query.toString();
    return request<PaginatedResult<JobApplicationDto>>(
      `/job-applications${queryString ? `?${queryString}` : ""}`,
    );
  },
  getApplicationById: (id: string) =>
    request<JobApplicationDto>(`/job-applications/${id}`),
  createApplication: (data: CreateJobApplicationInput) =>
    request<JobApplicationDto>("/job-applications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteApplication: (id: string) =>
    request<{ success: boolean }>(`/job-applications/${id}`, {
      method: "DELETE",
    }),
  updateApplicationStatus: (id: string, status: ApplicationStatus) =>
    request<JobApplicationDto>(`/job-applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  analyzeJob: (id: string) =>
    request<JobAnalysisDto>(`/job-applications/${id}/analyze`, {
      method: "POST",
    }),
  tailorResume: (id: string, targetLanguage?: SupportedLanguage) =>
    request<TailoredResumeDto>(`/job-applications/${id}/tailor`, {
      method: "POST",
      body: JSON.stringify({ targetLanguage }),
    }),
  getTailoredResume: (id: string) =>
    request<TailoredResumeDto>(`/job-applications/${id}/tailored-resume`),
  updateTailoredResume: (
    id: string,
    data: Partial<TailoredResumeDto> & { resumeId?: string },
  ) =>
    request<TailoredResumeDto>(`/job-applications/${id}/tailored-resume`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
