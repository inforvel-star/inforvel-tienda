'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader as Loader2 } from 'lucide-react';

interface PersonalInfoProps {
  userEmail: string | null;
  userName: string | null;
  avatarUrl: string | null;
  onAvatarUpdated: (value: string | null) => void;
}

export function PersonalInfo({ userEmail, userName, avatarUrl, onAvatarUpdated }: PersonalInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(avatarUrl);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: userEmail || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (userName) {
      const names = userName.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
      }));
    }
  }, [userName]);

  useEffect(() => {
    setAvatarPreviewUrl(avatarUrl || null);
    setSelectedAvatarFile(null);
  }, [avatarUrl]);

  useEffect(() => {
    if (!selectedAvatarFile) return;
    const localUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreviewUrl(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [selectedAvatarFile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }

      if (selectedAvatarFile) {
        const payload = new FormData();
        payload.append('avatar', selectedAvatarFile);

        const avatarRes = await fetch('/api/account/profile', {
          method: 'PUT',
          body: payload,
        });

        if (!avatarRes.ok) {
          const err = await avatarRes.json().catch(() => ({}));
          throw new Error(err?.error || 'No se pudo actualizar la foto de perfil');
        }

        const avatarData = await avatarRes.json();
        onAvatarUpdated(avatarData?.avatar_url ?? null);
      }

      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar el perfil';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Información personal</h2>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-zinc-200">Nombre</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-zinc-200">Apellidos</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-zinc-200">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            className="bg-zinc-900 border-zinc-800 text-white"
            disabled
          />
          <p className="text-xs text-zinc-500 mt-1">El email no puede ser modificado</p>
        </div>

        <div>
          <Label htmlFor="avatarFile" className="text-zinc-200">Foto de perfil</Label>
          {avatarPreviewUrl && (
            <div className="mt-2 mb-3">
              <img
                src={avatarPreviewUrl}
                alt="Vista previa avatar"
                className="w-16 h-16 rounded-full object-cover border border-zinc-700"
              />
            </div>
          )}
          <Input
            id="avatarFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setSelectedAvatarFile(file);
              if (!file) {
                setAvatarPreviewUrl(avatarUrl || null);
              }
            }}
            className="bg-zinc-900 border-zinc-800 text-white"
          />
          <p className="text-xs text-zinc-500 mt-1">Formatos: JPG, PNG o WEBP. Tamaño máximo: 2MB.</p>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Cambiar contraseña</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-zinc-200">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="Deja en blanco para no cambiar"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-zinc-200">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="Deja en blanco para no cambiar"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-zinc-200">Confirmar nueva contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="Deja en blanco para no cambiar"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </form>
    </div>
  );
}
