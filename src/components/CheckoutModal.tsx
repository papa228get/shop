'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Send } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: any[];
  total: number;
  loading: boolean;
}

export default function CheckoutModal({ isOpen, onClose, onConfirm, items, total, loading }: CheckoutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Задний фон (Overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Окно заказа (BottomSheet) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-[2.5rem] z-[101] shadow-2xl overflow-hidden"
          >
            {/* Полоска сверху для красоты */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-full mx-auto mt-4 mb-2" />

            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <ShoppingBag className="text-blue-600" /> Ваш заказ
                </h2>
                <button onClick={onClose} className="bg-gray-100 dark:bg-neutral-800 p-2 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              {/* Список товаров */}
              <div className="max-h-[40vh] overflow-y-auto mb-8 space-y-4 no-scrollbar">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-800 dark:text-white uppercase truncate max-w-[180px]">{item.name}</p>
                        {item.is_preorder && (
                          <span className="text-[9px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded-md">ПРЕДЗАКАЗ</span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Кол-во: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{item.price * item.quantity} ₽</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Итого */}
              <div className="flex justify-between items-center mb-8 px-2">
                <span className="text-gray-400 font-black uppercase text-xs tracking-widest">Итого к оплате</span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">{total.toFixed(0)} ₽</span>
              </div>

              {/* Кнопка действия */}
              <button
                disabled={loading}
                onClick={onConfirm}
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    Подтвердить
                  </>
                )}
              </button>
              
              <p className="text-center text-[9px] text-gray-400 mt-6 font-bold uppercase tracking-tighter opacity-50">
                Нажимая на кнопку, вы отправляете заказ админу в Telegram
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
