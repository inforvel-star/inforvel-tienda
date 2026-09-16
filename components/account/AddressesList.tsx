'use client';

import { useState, useEffect } from 'react';
import { databaseAPI, Address } from '@/lib/api/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, Plus, CreditCard as Edit, Trash2, Loader as Loader2 } from 'lucide-react';

export function AddressesList() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Address, 'id'> & { id?: string }>({
    type: 'shipping',
    first_name: '',
    last_name: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'ES',
    phone: '',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const addresses = await databaseAPI.getAddresses();
      setAddresses(addresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      if (!formData.first_name || !formData.last_name || !formData.address_1 || !formData.city || !formData.postcode) {
        toast.error('Por favor, completa todos los campos obligatorios');
        return;
      }

      let success = false;

      if (editingId) {
        success = await databaseAPI.updateAddress(editingId, formData as any);
        if (success) {
          toast.success('Dirección actualizada correctamente');
        } else {
          toast.error('Error al actualizar la dirección');
          return;
        }
      } else {
        success = await databaseAPI.saveAddress(formData as any);
        if (success) {
          toast.success('Dirección guardada correctamente');
        } else {
          toast.error('Error al guardar la dirección');
          return;
        }
      }

      setIsEditing(false);
      setEditingId(null);
      setFormData({
        type: 'shipping',
        first_name: '',
        last_name: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'ES',
        phone: '',
        is_default: false,
      });
      loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Error al guardar la dirección');
    }
  };

  const handleEditAddress = (address: Address) => {
    setFormData(address);
    setEditingId(address.id);
    setIsEditing(true);
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const success = await databaseAPI.deleteAddress(id);

      if (success) {
        toast.success('Dirección eliminada correctamente');
        loadAddresses();
      } else {
        toast.error('Error al eliminar la dirección');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Error al eliminar la dirección');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {editingId ? 'Editar dirección' : 'Nueva dirección'}
          </h2>
          <Button
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setFormData({
                type: 'shipping',
                first_name: '',
                last_name: '',
                address_1: '',
                address_2: '',
                city: '',
                state: '',
                postcode: '',
                country: 'ES',
                phone: '',
                is_default: false,
              });
            }}
          >
            Cancelar
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-zinc-200">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name" className="text-zinc-200">Apellidos *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-zinc-200">Teléfono *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="address_1" className="text-zinc-200">Dirección *</Label>
            <Input
              id="address_1"
              value={formData.address_1}
              onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="address_2" className="text-zinc-200">Dirección 2 (opcional)</Label>
            <Input
              id="address_2"
              value={formData.address_2}
              onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="text-zinc-200">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-zinc-200">Provincia</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postcode" className="text-zinc-200">Código postal *</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-zinc-200">País</Label>
              <Input
                id="country"
                value="España"
                className="bg-zinc-900 border-zinc-800 text-white"
                disabled
              />
            </div>
          </div>

          <Button
            onClick={handleSaveAddress}
            className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {editingId ? 'Actualizar dirección' : 'Guardar dirección'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Direcciones guardadas</h2>
        <Button
          onClick={() => setIsEditing(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva dirección
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white">
            No tienes direcciones guardadas
          </h3>
          <p className="text-zinc-400 mb-6">
            Agrega una dirección de envío para agilizar tus compras
          </p>
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar dirección
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className="p-4 bg-zinc-950 border-zinc-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-white">
                    {address.type === 'shipping' ? 'Envío' : 'Facturación'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditAddress(address)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm space-y-1 text-zinc-300">
                <p className="font-medium">
                  {address.first_name} {address.last_name}
                </p>
                <p>{address.address_1}</p>
                {address.address_2 && <p>{address.address_2}</p>}
                <p>
                  {address.postcode} {address.city}
                  {address.state && `, ${address.state}`}
                </p>
                <p>{address.phone}</p>
              </div>

              {address.is_default && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full border border-blue-500/20">
                    Dirección predeterminada
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
