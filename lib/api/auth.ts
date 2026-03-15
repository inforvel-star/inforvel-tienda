const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

export interface LoginResponse {
  success: boolean;
  token?: string;
  user_email?: string;
  user_nicename?: string;
  user_display_name?: string;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user_id?: number;
}

export const authAPI = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.message || 'Error al iniciar sesión',
        };
      }

      const data = await response.json();

      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('wc_auth_token', data.token);
          localStorage.setItem('wc_user_email', data.user_email || '');
          localStorage.setItem('wc_user_display_name', data.user_display_name || '');
        }

        return {
          success: true,
          token: data.token,
          user_email: data.user_email,
          user_nicename: data.user_nicename,
          user_display_name: data.user_display_name,
        };
      }

      return {
        success: false,
        message: 'Credenciales inválidas',
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error de conexión. Intenta de nuevo.',
      };
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wc_auth_token');
      localStorage.removeItem('wc_user_email');
      localStorage.removeItem('wc_user_display_name');
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_user_email');
  },

  getUserDisplayName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_user_display_name');
  },

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  },
};
