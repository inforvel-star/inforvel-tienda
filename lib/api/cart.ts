import { CartItem } from '../store/cartStore';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

export interface CartAPIResponse {
  success: boolean;
  cart?: CartItem[];
  message?: string;
}

export const cartAPI = {
  async getCart(token: string): Promise<CartAPIResponse> {
    try {
      const response = await fetch(`${WC_URL}/wp-json/custom/v1/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener el carrito');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getCart:', error);
      return { success: false, message: 'Error al obtener el carrito' };
    }
  },

  async saveCart(token: string, items: CartItem[]): Promise<CartAPIResponse> {
    try {
      const response = await fetch(`${WC_URL}/wp-json/custom/v1/cart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el carrito');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en saveCart:', error);
      return { success: false, message: 'Error al guardar el carrito' };
    }
  },

  async clearCart(token: string): Promise<CartAPIResponse> {
    try {
      const response = await fetch(`${WC_URL}/wp-json/custom/v1/cart`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al limpiar el carrito');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en clearCart:', error);
      return { success: false, message: 'Error al limpiar el carrito' };
    }
  },
};
