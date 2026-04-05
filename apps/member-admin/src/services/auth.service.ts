import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import {
  LoginRequest,
  LoginResponse,
  RegisterCompanyRequest,
  RegisterResponse,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  Company,
  Subscription,
} from '@/types';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data;
  }

  async loginEmployee(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN_EMPLOYEE,
      credentials
    );
    return response.data;
  }

  async register(data: RegisterCompanyRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  }

  async logout(): Promise<void> {
    // JWT is stateless - just clear local storage
    // No server call needed
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.VERIFY_EMAIL,
      { token }
    );
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email }
    );
    return response.data;
  }

  async resetPassword(
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, password, confirmPassword }
    );
    return response.data;
  }

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return response.data;
  }

  async getCurrentUser(): Promise<{
    user: User;
    company: Company;
    subscription?: Subscription;
  }> {
    const response = await apiClient.get<{
      user: User;
      company: Company;
      subscription?: Subscription;
    }>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  }
}

export const authService = new AuthService();
