'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store/cartStore';
import { woocommerce } from '@/lib/woocommerce';
import { toast } from 'sonner';

export function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { items, clearCart, getTotal } = useCartStore();

  const [isLoading, setIsLoading] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'ES',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (
      !billingDetails.firstName ||
      !billingDetails.lastName ||
      !billingDetails.email ||
      !billingDetails.phone ||
      !billingDetails.address ||
      !billingDetails.city ||
      !billingDetails.postcode
    ) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    setIsLoading(true);

    try {
      const { error: submitError } = await elements.submit();

      if (submitError) {
        toast.error(submitError.message || 'Error al procesar el pago');
        setIsLoading(false);
        return;
      }

      const order = await woocommerce.createOrder({
        payment_method: 'stripe',
        payment_method_title: 'Tarjeta de crédito',
        billing: {
          first_name: billingDetails.firstName,
          last_name: billingDetails.lastName,
          email: billingDetails.email,
          phone: billingDetails.phone,
          address_1: billingDetails.address,
          city: billingDetails.city,
          state: billingDetails.state,
          postcode: billingDetails.postcode,
          country: billingDetails.country,
        },
        line_items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      });

      if (!order) {
        throw new Error('Error al crear el pedido');
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/confirmacion?order_id=${order.id}`,
        },
      });

      if (error) {
        toast.error(error.message || 'Error al procesar el pago');
      } else {
        clearCart();
        router.push(`/confirmacion?order_id=${order.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el pedido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4 text-white">Información de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-zinc-200">Nombre *</Label>
            <Input
              id="firstName"
              type="text"
              value={billingDetails.firstName}
              onChange={(e) =>
                setBillingDetails({ ...billingDetails, firstName: e.target.value })
              }
              className="bg-zinc-900 border-zinc-800 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-zinc-200">Apellidos *</Label>
            <Input
              id="lastName"
              type="text"
              value={billingDetails.lastName}
              onChange={(e) =>
                setBillingDetails({ ...billingDetails, lastName: e.target.value })
              }
              className="bg-zinc-900 border-zinc-800 text-white"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-zinc-200">Email *</Label>
        <Input
          id="email"
          type="email"
          value={billingDetails.email}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, email: e.target.value })
          }
          className="bg-zinc-900 border-zinc-800 text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-zinc-200">Teléfono *</Label>
        <Input
          id="phone"
          type="tel"
          value={billingDetails.phone}
          onChange={(e) =>
            setBillingDetails({ ...billingDetails, phone: e.target.value })
          }
          className="bg-zinc-900 border-zinc-800 text-white"
          required
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-white">Dirección de envío</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address" className="text-zinc-200">Dirección *</Label>
            <Input
              id="address"
              type="text"
              value={billingDetails.address}
              onChange={(e) =>
                setBillingDetails({ ...billingDetails, address: e.target.value })
              }
              className="bg-zinc-900 border-zinc-800 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="text-zinc-200">Ciudad *</Label>
              <Input
                id="city"
                type="text"
                value={billingDetails.city}
                onChange={(e) =>
                  setBillingDetails({ ...billingDetails, city: e.target.value })
                }
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-zinc-200">Provincia</Label>
              <Input
                id="state"
                type="text"
                value={billingDetails.state}
                onChange={(e) =>
                  setBillingDetails({ ...billingDetails, state: e.target.value })
                }
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postcode" className="text-zinc-200">Código postal *</Label>
              <Input
                id="postcode"
                type="text"
                value={billingDetails.postcode}
                onChange={(e) =>
                  setBillingDetails({ ...billingDetails, postcode: e.target.value })
                }
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-zinc-200">País</Label>
              <Input
                id="country"
                type="text"
                value="España"
                className="bg-zinc-900 border-zinc-800 text-white"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-white">Información de pago</h2>
        <PaymentElement />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? 'Procesando...' : `Pagar ${getTotal().toFixed(2)}€`}
      </Button>

      <p className="text-xs text-center text-zinc-400">
        Al realizar el pedido, aceptas nuestros términos y condiciones y política
        de privacidad
      </p>
    </form>
  );
}
