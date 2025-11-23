export interface User {
    id: number;
    email: string;
    isAdmin: boolean;
    createdAt: string;
}
export interface Monitor {
    id: number;
    userId: number;
    name: string;
    stationSignature: string;
    stationName: string;
    destSignature?: string | null;
    destName?: string | null;
    scheduleTime: string;
    scheduleDate?: string;
    timezone: string;
    delayThreshold: number;
    discordWebhookUrl: string | null;
    active: boolean;
    lastRunAt: string | null;
    lastRunStatus: 'success' | 'failed' | 'running' | null;
    createdAt: string;
    updatedAt: string;
}
export interface StationDelay {
    trainNumber: string;
    trainCompany?: string;
    journey: string;
    delayMinutes: number;
    departurePlanned: string;
    departureActual: string;
    arrivalPlanned: string;
    arrivalActual: string;
    delayReason: string;
    alternativeInfo?: string;
    replacementBus?: {
        trainNumber: string;
        departureTime: string;
        description?: string;
        company?: string;
        directTo?: string;
        stopLocation?: string;
    };
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
    expiresAt: string | null;
    usedAt: string | null;
    active: boolean;
    createdAt: string;
    usedByEmail?: string;
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
    scheduleTime: string;
    scheduleDate: string;
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
    scheduleDate?: string;
    timezone?: string;
    delayThreshold?: number;
    discordWebhookUrl?: string;
    active?: boolean;
}
export interface CreateInviteDto {
    expiresInDays?: number | null;
}
export interface DelaySearchDto {
    stationSignature: string;
    startDate: string;
    endDate: string;
    minDelayMinutes?: number;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    inviteCode?: string;
}
export interface HealthCheck {
    status: 'ok' | 'error';
    database: 'connected' | 'disconnected';
    timestamp: string;
}
//# sourceMappingURL=types.d.ts.map
