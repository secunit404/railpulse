import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios';
import type {
  User,
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  InviteCode,
  CreateInviteDto,
  AdminResetPasswordDto,
  AdminResetPasswordResponse
} from '../../../shared/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function login(email: string, password: string) {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/login', {
      email,
      password,
    } as LoginDto);

    user.value = response.data.user;
    return response.data.user;
  }

  async function register(email: string, password: string, displayName?: string, inviteCode?: string) {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/register', {
      email,
      password,
      displayName,
      inviteCode,
    } as RegisterDto);

    user.value = response.data.user;
    return response.data.user;
  }

  async function logout() {
    await api.post('/api/auth/logout');
    user.value = null;
  }

  async function fetchUser() {
    try {
      const response = await api.get<{ user: User }>('/api/auth/me');
      user.value = response.data.user;
    } catch (error) {
      user.value = null;
      throw error;
    }
  }

  async function checkFirstUser(): Promise<boolean> {
    const response = await api.get<{ isFirstUser: boolean }>('/api/auth/first-user');
    return response.data.isFirstUser;
  }

  async function forgotPassword(email: string) {
    const response = await api.post<{
      success: boolean;
      message: string;
      resetToken?: string;
      resetLink?: string;
    }>('/api/auth/forgot-password', { email } as ForgotPasswordDto);
    return response.data;
  }

  async function resetPassword(token: string, newPassword: string) {
    const response = await api.post<{ success: boolean; message: string }>('/api/auth/reset-password', {
      token,
      newPassword,
    } as ResetPasswordDto);
    return response.data;
  }

  async function adminResetPassword(email: string, sendEmail?: boolean) {
    const response = await api.post<AdminResetPasswordResponse>('/api/auth/admin/reset-password', {
      email,
      sendEmail,
    } as AdminResetPasswordDto);
    return response.data;
  }

  async function getProfile() {
    const response = await api.get<{ user: User }>('/api/user/profile');
    user.value = response.data.user;
    return response.data.user;
  }

  async function updateProfile(data: UpdateProfileDto) {
    const response = await api.patch<{ success: boolean; user: User }>('/api/user/profile', data);
    user.value = response.data.user;
    return response.data.user;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const response = await api.post<{ success: boolean; message: string }>('/api/user/change-password', {
      currentPassword,
      newPassword,
    } as ChangePasswordDto);
    return response.data;
  }

  async function deleteAccount() {
    const response = await api.delete<{ success: boolean; message: string }>('/api/user/account');
    user.value = null;
    return response.data;
  }

  async function getAllInviteCodes() {
    const response = await api.get<{ invites: InviteCode[] }>('/api/auth/invites/all');
    return response.data.invites;
  }

  async function createInviteCode(expiresInDays?: number | null) {
    const response = await api.post<{ success: boolean; invite: InviteCode }>('/api/auth/invites', {
      expiresInDays,
    } as CreateInviteDto);
    return response.data.invite;
  }

  async function deactivateInviteCode(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/auth/invites/${id}`);
    return response.data;
  }

  async function deleteInviteCode(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/auth/invites/${id}?permanent=true`);
    return response.data;
  }

  async function getAllUsers() {
    const response = await api.get<{ users: User[] }>('/api/user/all');
    return response.data.users;
  }

  async function updateUserStatus(userId: number, isActive: boolean) {
    const response = await api.patch<{ success: boolean; message: string }>(`/api/user/${userId}/status`, {
      isActive,
    });
    return response.data;
  }

  async function deleteUser(userId: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/user/${userId}`);
    return response.data;
  }

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
    checkFirstUser,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getAllInviteCodes,
    createInviteCode,
    deactivateInviteCode,
    deleteInviteCode,
    getAllUsers,
    updateUserStatus,
    deleteUser,
    adminResetPassword,
  };
});
