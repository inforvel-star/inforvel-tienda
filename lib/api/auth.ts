export interface LoginResponse {
  success: boolean;
  user_email?: string;
  user_nicename?: string;
  user_display_name?: string;
  avatar_url?: string | null;
  customer_id?: number | null;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user_id?: number;
}

export interface SessionResponse {
  authenticated: boolean;
  email?: string;
  user_display_name?: string;
  avatar_url?: string | null;
  customer_id?: number | null;
}

function emitAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('inforvel-auth-changed'));
}

function storeSessionMeta(data: LoginResponse | SessionResponse) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('wc_auth_state', '1');
  const email =
    'user_email' in data
      ? data.user_email
      : ('email' in data ? data.email : undefined);
  if (email) {
    localStorage.setItem('wc_user_email', email);
  }
  if ('user_display_name' in data && data.user_display_name) {
    localStorage.setItem('wc_user_display_name', data.user_display_name);
  }
  if ('avatar_url' in data) {
    const avatar = data.avatar_url;
    if (avatar && String(avatar).trim()) {
      localStorage.setItem('wc_user_avatar_url', String(avatar).trim());
    } else {
      localStorage.removeItem('wc_user_avatar_url');
    }
  }
  const customerId = 'customer_id' in data ? data.customer_id : null;
  if (customerId) {
    localStorage.setItem('wc_user_id', String(customerId));
  }
  emitAuthChanged();
}

function clearSessionMeta() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('wc_auth_state');
  localStorage.removeItem('wc_auth_token');
  sessionStorage.removeItem('wc_auth_token');
  localStorage.removeItem('wc_user_email');
  localStorage.removeItem('wc_user_display_name');
  localStorage.removeItem('wc_user_avatar_url');
  localStorage.removeItem('wc_user_id');
  emitAuthChanged();
}

export const authAPI = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Error al iniciar sesión',
        };
      }

      storeSessionMeta(data);
      return {
        success: true,
        user_email: data.user_email,
        user_nicename: data.user_nicename,
        user_display_name: data.user_display_name,
        avatar_url: data.avatar_url ?? null,
        customer_id: data.customer_id ?? null,
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error de conexión. Intenta de nuevo.',
      };
    }
  },


  async logout(): Promise<void> {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // no-op
    } finally {
      clearSessionMeta();
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('wc_auth_state') === '1';
  },

  getUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_user_email');
  },

  getUserDisplayName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_user_display_name');
  },

  async getSession(): Promise<SessionResponse> {
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });

      if (!response.ok) {
        clearSessionMeta();
        return { authenticated: false };
      }

      const data = await response.json();
      storeSessionMeta({ authenticated: true, ...data });
      return { authenticated: true, ...data };
    } catch (error) {
      console.error('Error loading session:', error);
      return { authenticated: false };
    }
  },

  getUserAvatarUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wc_user_avatar_url');
  },
};
