'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore, CartItem as CartItemType } from '@/lib/store/cartStore';
import { useState } from 'react';

interface CartItemProps {
  item: CartItemType;
  compact?: boolean;
}

export function CartItem({ item, compact = false }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    setTimeout(() => {
      removeItem(item.id, item.variationId);
    }, 300);
  };

  const handleUpdateQuantity = (newQty: number) => {
    if (newQty < 1) {
      handleRemove();
      return;
    }
    updateQuantity(item.id, newQty, item.variationId);
  };

  const itemTotal = item.price * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isRemoving ? 0 : 1,
        y: isRemoving ? -20 : 0,
        scale: isRemoving ? 0.95 : 1
      }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${compact ? 'p-2' : 'p-4'} bg-white rounded-lg border hover:shadow-md transition-shadow`}
    >
      <div className={`relative ${compact ? 'w-16 h-16' : 'w-24 h-24'} flex-shrink-0 bg-gray-100 rounded-md overflow-hidden`}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
            {item.name}
          </h3>
          {item.variationId && (
            <p className="text-xs text-gray-500 mt-1">
              Variación ID: {item.variationId}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={compact ? 'h-7 w-7' : 'h-8 w-8'}
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={isRemoving}
            >
              <Minus className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>

            <span className={`font-medium ${compact ? 'text-sm' : 'text-base'} min-w-[2rem] text-center`}>
              {item.quantity}
            </span>

            <Button
              variant="outline"
              size="icon"
              className={compact ? 'h-7 w-7' : 'h-8 w-8'}
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={isRemoving || (item.maxStock ? item.quantity >= item.maxStock : false)}
            >
              <Plus className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <p className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
              ${itemTotal.toFixed(2)}
            </p>

            <Button
              variant="ghost"
              size="icon"
              className={`text-red-500 hover:text-red-700 hover:bg-red-50 ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}
              onClick={handleRemove}
              disabled={isRemoving}
            >
              <Trash2 className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        {item.maxStock && item.quantity >= item.maxStock && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-amber-600 mt-1"
          >
            Stock máximo alcanzado
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
