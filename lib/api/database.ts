interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variationId?: number;
}

export interface Address {
  id: string;
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  is_default: boolean;
}

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wc_auth_state') === '1' ? 'session' : null;
};

export const databaseAPI = {
  async getCartItems(): Promise<CartItem[]> {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch('/api/account/cart', {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  },

  async saveCartItems(items: CartItem[]): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/account/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  },

  async clearCart(): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/account/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  },

  async getAddresses(): Promise<Address[]> {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await fetch('/api/account/addresses', {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.addresses || [];
    } catch (error) {
      console.error('Error loading addresses:', error);
      return [];
    }
  },

  async saveAddress(address: Address): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(address),
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving address:', error);
      return false;
    }
  },

  async updateAddress(id: string, address: Address): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(address),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating address:', error);
      return false;
    }
  },

  async deleteAddress(id: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting address:', error);
      return false;
    }
  },
};
