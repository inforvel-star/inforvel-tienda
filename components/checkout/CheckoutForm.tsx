'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store/cartStore';
import { useCouponStore } from '@/lib/store/couponStore';

import { toast } from 'sonner';
import { CheckboxesFormularioCompra } from '@/components/FormularioConsentimiento';
import { PaymentRequest } from '@stripe/stripe-js';

interface CheckoutFormProps {
  clientSecret: string;
  paymentIntentId: string;
  checkoutToken: string;
}

export function CheckoutForm({ clientSecret, paymentIntentId, checkoutToken }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { items, clearCart, getTotal } = useCartStore();
  const { appliedCoupon, setCoupon, removeCoupon } = useCouponStore();

  const subtotal = getTotal();
  const total = Math.max(0, subtotal - (appliedCoupon?.discount || 0));

  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [consentPrivacidad, setConsentPrivacidad] = useState(false);
  const [consentCondiciones, setConsentCondiciones] = useState(false);
  const [consentPublicidad, setConsentPublicidad] = useState(false);
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

  // Set up Google Pay / Apple Pay
  useEffect(() => {
    if (!stripe) return;

    let prTotal = getTotal();
    if (appliedCoupon) {
      prTotal = Math.max(0, prTotal - appliedCoupon.discount);
    }
    const pr = stripe.paymentRequest({
      country: 'ES',
      currency: 'eur',
      total: {
        label: 'Inforvel - Total',
        amount: Math.round(prTotal * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      try {
        // Create WooCommerce order with wallet payer info
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntentId,
            checkout_token: checkoutToken,
            payment_method: 'stripe',
            payment_method_title: ev.walletName || 'Google Pay / Apple Pay',
            billing: {
              first_name: ev.payerName?.split(' ')[0] || '',
              last_name: ev.payerName?.split(' ').slice(1).join(' ') || '',
              email: ev.payerEmail || '',
              phone: ev.payerPhone || '',
              address_1: '',
              city: '',
              state: '',
              postcode: '',
              country: 'ES',
            },
            line_items: items.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
            })),
            ...(appliedCoupon && {
              coupon_lines: [
                { code: appliedCoupon.code }
              ]
            }),
          })
        });

        const order = await response.json();
        if (!response.ok || !order?.id) {
          ev.complete('fail');
          toast.error(order?.error || 'Error al crear el pedido');
          return;
        }

        // Confirm payment with the PaymentIntent
        const { error } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete('fail');
          toast.error(error.message || 'Error al procesar el pago');
        } else {
          ev.complete('success');
          clearCart();
          removeCoupon();
          router.push(`/confirmacion?order_id=${order.id}&payment_intent=${paymentIntentId}`);
        }
      } catch (error) {
        ev.complete('fail');
        console.error('Wallet payment error:', error);
        toast.error('Error al procesar el pago');
      }
    });
  }, [stripe, getTotal, items, clearCart, router, clientSecret, appliedCoupon, paymentIntentId, checkoutToken, removeCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Introduce un código de cupón');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const response = await fetch(`/api/coupons?code=${encodeURIComponent(couponInput.trim())}`);
      const coupons = await response.json();

      if (!coupons || coupons.length === 0) {
        toast.error('Cupón no válido o no existe');
        return;
      }

      const coupon = coupons[0];

      if (coupon.date_expires) {
        const expiryDate = new Date(coupon.date_expires);
        if (expiryDate < new Date()) {
          toast.error('Este cupón ha caducado');
          return;
        }
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        toast.error('Este cupón ya ha alcanzado su límite de uso');
        return;
      }

      let discountAmount = 0;
      const cartTotal = getTotal();

      if (coupon.discount_type === 'percent') {
        discountAmount = cartTotal * (parseFloat(coupon.amount) / 100);
      } else {
        discountAmount = parseFloat(coupon.amount);
      }

      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }

      setCoupon({ code: coupon.code, discount: discountAmount });
      toast.success('Cupón aplicado correctamente');
      setCouponInput('');
    } catch (error) {
      console.error('Error aplicando cupón:', error);
      toast.error('Error al validar el cupón');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

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

    if (!consentPrivacidad || !consentCondiciones) {
      toast.error('Debes aceptar la Política de Privacidad y las Condiciones Generales para continuar');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Validate the payment form
      const { error: submitError } = await elements.submit();

      if (submitError) {
        toast.error(submitError.message || 'Error en los datos de pago');
        setIsLoading(false);
        return;
      }

      // 2. Create the WooCommerce order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          checkout_token: checkoutToken,
          payment_method: 'stripe',
          payment_method_title: 'Pago con tarjeta (Stripe)',
          ...(appliedCoupon && {
            coupon_lines: [
              { code: appliedCoupon.code }
            ]
          }),
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
          consent: {
            privacy: consentPrivacidad,
            terms: consentCondiciones,
            marketing: consentPublicidad,
          },
        })
      });
      const order = await response.json();


      if (!response.ok || !order?.id) {
        throw new Error(order?.error || 'No se pudo crear el pedido en WooCommerce');
      }

      // 3. Confirm the payment with Stripe using the clientSecret
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/confirmacion?order_id=${order.id}&payment_intent=${paymentIntentId}`,
          payment_method_data: {
            billing_details: {
              name: `${billingDetails.firstName} ${billingDetails.lastName}`,
              email: billingDetails.email,
              phone: billingDetails.phone,
              address: {
                line1: billingDetails.address,
                city: billingDetails.city,
                state: billingDetails.state,
                postal_code: billingDetails.postcode,
                country: billingDetails.country,
              },
            },
          },
        },
      });

      if (confirmError) {
        // If Stripe fails but order was created, it stays as 'pending' in WooCommerce
        toast.error(confirmError.message || 'Error al procesar el pago');
      } else {
        // Payment succeeded (redirect handled by Stripe for 3DS etc)
        clearCart();
        removeCoupon();
        router.push(`/confirmacion?order_id=${order.id}`);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Error al procesar el pedido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentRequest && (
        <div className="mb-8">
          <h3 className="text-base font-semibold mb-4 text-white">Pago rápido</h3>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: 'default',
                  theme: 'dark',
                  height: '56px',
                },
              },
            }}
          />
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Usa Apple Pay, Google Pay o tu navegador
          </p>
          <div className="flex items-center gap-3 mt-8 mb-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-sm text-zinc-400">O completa el formulario</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </div>
      )}

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
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="coupon" className="text-zinc-200">
                  Cupón {appliedCoupon && <span className="text-green-500 ml-2">(Aplicado: -{appliedCoupon.discount.toFixed(2)}€)</span>}
                </Label>
                <Input
                  id="coupon"
                  type="text"
                  placeholder="Introduce tu código"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="bg-zinc-950 border-zinc-800 text-white"
                  disabled={!!appliedCoupon}
                />
              </div>
              {appliedCoupon ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:self-end"
                  onClick={() => {
                    removeCoupon();
                    setCouponInput('');
                  }}
                >
                  Quitar cupón
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:self-end border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon}
                >
                  {isApplyingCoupon ? 'Aplicando...' : 'Aplicar cupón'}
                </Button>
              )}
            </div>
          </div>

          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      <CheckboxesFormularioCompra
        privacidad={consentPrivacidad}
        onPrivacidadChange={setConsentPrivacidad}
        condiciones={consentCondiciones}
        onCondicionesChange={setConsentCondiciones}
        publicidad={consentPublicidad}
        onPublicidadChange={setConsentPublicidad}
      />

      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? 'Procesando...' : `Pagar ${total.toFixed(2)}€`}
      </Button>
    </form>
  );
}
