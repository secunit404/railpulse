// Shared TypeScript types for frontend and backend

export interface User {
  id: number;
  email: string;
  displayName?: string | null;
  timezone?: string;
  hideBusReplacedTrains?: boolean;
  isAdmin: boolean;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  usedInviteCodeId?: number | null;
  usedInviteCode?: {
    code: string;
  } | null;
  _count?: {
    monitors: number;
    searchHistory: number;
  };
}

export interface Monitor {
  id: number;
  userId: number;
  name: string;
  stationSignature: string;
  stationName: string;
  destSignature?: string | null;
  destName?: string | null;
  scheduleTime?: string | null; // HH:mm format - only used for 'daily' mode
  runMode: 'daily' | 'one-time';
  scheduleDate?: string | null; // YYYY-MM-DD format - start date for 'one-time' mode
  scheduleEndDate?: string | null; // YYYY-MM-DD format - end date for 'one-time' mode (optional, defaults to scheduleDate)
  timezone: string;
  delayThreshold: number;
  discordWebhookUrl: string | null;
  active: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | 'running' | null;
  lastRunResultCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StationDelay {
  trainNumber: string;
  trainCompany?: string; // e.g., "Västtågen", "SJ Regional"
  journey: string; // "Origin → Destination"
  delayMinutes: number;
  departurePlanned: string; // ISO string
  departureActual: string; // ISO string
  arrivalPlanned: string; // ISO string
  arrivalActual: string; // ISO string
  delayReason: string;
  alternativeInfo?: string; // Info about taking alternative train
}

export interface Station {
  signature: string;
  advertisedName: string;
  shortName: string | null;
}

export interface InviteCode {
  id: number;
  code: string;
  createdBy: number;
  creatorEmail?: string;
  creatorDisplayName?: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  usedByEmail?: string | null;
  usedByDisplayName?: string | null;
  active: boolean;
  createdAt: string;
  isExpired?: boolean;
  isUsed?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateMonitorDto {
  name: string;
  stationSignature: string;
  stationName: string;
  destSignature: string;
  destName: string;
  scheduleTime?: string;
  runMode: 'daily' | 'one-time';
  scheduleDate?: string;
  scheduleEndDate?: string;
  timezone?: string;
  delayThreshold?: number;
  discordWebhookUrl?: string;
}

export interface UpdateMonitorDto {
  name?: string;
  stationSignature?: string;
  stationName?: string;
  destSignature?: string;
  destName?: string;
  scheduleTime?: string;
  runMode?: 'daily' | 'one-time';
  scheduleDate?: string;
  scheduleEndDate?: string;
  timezone?: string;
  delayThreshold?: number;
  discordWebhookUrl?: string;
  active?: boolean;
}

export interface CreateInviteDto {
  expiresInDays?: number | null; // null = permanent, number = days until expiration
}

export interface DelaySearchDto {
  stationSignature: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  minDelayMinutes?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
  inviteCode?: string;
}

export interface UpdateProfileDto {
  displayName?: string | null;
  timezone?: string;
  email?: string;
  hideBusReplacedTrains?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface AdminResetPasswordDto {
  email: string;
  sendEmail?: boolean;
}

export interface AdminResetPasswordResponse {
  success: boolean;
  message: string;
  resetToken: string;
  resetLink: string;
  delivery: 'email' | 'manual';
  expiresAt: string;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export interface SearchHistory {
  id: number;
  userId: number;
  monitorId?: number | null;
  monitor?: {
    id: number;
    name: string;
  } | null;
  searchType: 'auto' | 'manual';
  stationSignature: string;
  stationName: string;
  destSignature?: string | null;
  destName?: string | null;
  startDate: string;
  endDate: string;
  delayThreshold: number;
  results: StationDelay[];
  resultCount: number;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
}

export interface SearchHistoryListResponse {
  entries: SearchHistory[];
  total: number;
  limit: number;
  offset: number;
}
