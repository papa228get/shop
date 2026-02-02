'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import CheckoutModal from '@/components/CheckoutModal';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  old_price?: number;
  images: string[];
  quantity: number;
  is_preorder: boolean;
}

const categories = [
  { id: 'all', name: 'Все', icon: <ShoppingCart size={16} /> },
  { id: 'Одежда', name: 'Одежда' },
  { id: 'Обувь', name: 'Обувь' },
  { id: 'Аксессуары', name: 'Аксессуары' },
];

export default function Home() {
  const { cart, addToCart, removeFromCart, totalItems, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Состояния для модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (data) setProducts(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = Object.entries(cart).reduce((total, [id, qty]) => {
    const product = products.find(p => p.id === Number(id));
    return total + (product ? product.price * qty : 0);
  }, 0);

  const orderItems = Object.entries(cart).map(([id, qty]) => {
    const product = products.find(p => p.id === Number(id));
    return { id: Number(id), name: product?.name, price: product?.price, quantity: qty, is_preorder: product?.is_preorder };
  });

      const handleConfirmOrder = async () => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    
    const tgUser = tg?.initDataUnsafe?.user;
    // Отправляем ТОЛЬКО ID. Остальное бот возьмет из базы.
    const user = {
      id: tgUser?.id || 7393866798
    };

    setIsCheckoutLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, total: totalPrice, user: user }),
      });
      const result = await response.json();
      if (result.ok) {
        setIsModalOpen(false);
        clearCart();
        setShowSuccessModal(true);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      setShowErrorModal(true);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <main className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="flex justify-between items-center mb-6 px-2">
        <h1 className="text-2xl font-black uppercase tracking-tighter">ZHANIS SHOP</h1>
        <div className="bg-blue-600 text-white p-2.5 rounded-2xl relative shadow-lg shadow-blue-500/30">
          <ShoppingBag size={22} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white dark:border-neutral-900">
              {totalItems}
            </span>
          )}
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs font-bold transition-all ${
              selectedCategory === cat.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'bg-white dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-neutral-700'
            }`}
          >
            {cat.icon && cat.icon}
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const inCart = cart[product.id] || 0;
            const isOutOfStock = product.quantity <= 0 && !product.is_preorder;
            const isLimitReached = !product.is_preorder && inCart >= product.quantity;

            return (
              <div key={product.id} className="bg-white dark:bg-neutral-800 rounded-[2rem] overflow-hidden shadow-sm flex flex-col border border-gray-50 dark:border-neutral-800 group">
                <Link href={`/product/${product.id}`} className="relative aspect-[4/5] w-full bg-gray-50 dark:bg-neutral-900 overflow-hidden">
                   {isOutOfStock && (
                     <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                        <span className="bg-white text-black text-[9px] font-black px-3 py-1 rounded-full uppercase">Sold Out</span>
                     </div>
                   )}
                   {product.is_preorder && !isOutOfStock && (
                     <div className="absolute top-3 right-3 bg-purple-600 text-white text-[9px] font-black px-2 py-1 rounded-lg z-10 uppercase tracking-tighter shadow-lg shadow-purple-500/30">
                       ПРЕДЗАКАЗ
                     </div>
                   )}
                   {product.old_price && !isOutOfStock && (
                     <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg z-10 uppercase tracking-tighter shadow-lg shadow-red-500/30">
                       SALE
                     </div>
                   )}
                   <Image src={product.images?.[0] || ''} alt={product.name} fill className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
                </Link>
                <div className="p-4 flex flex-col flex-grow">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{product.category}</span>
                  <Link href={`/product/${product.id}`}><h3 className="font-bold text-[11px] uppercase truncate mb-2 text-gray-800 dark:text-white group-hover:text-blue-600">{product.name}</h3></Link>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-blue-600 font-black text-sm">{product.price} ₽</span>
                    {product.old_price && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 line-through text-[9px] font-bold">{product.old_price} ₽</span>
                        <span className="text-red-500 text-[8px] font-black px-1 py-0.5 rounded-md">-{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    {isOutOfStock ? (
                      <button disabled className="w-full py-3 bg-gray-50 dark:bg-neutral-700 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest">Продано</button>
                    ) : cart[product.id] ? (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-900 rounded-2xl p-1 border dark:border-neutral-700 shadow-inner">
                        <button onClick={() => removeFromCart(product.id)} className="p-2 text-red-500 active:scale-75 transition-transform"><Minus size={14} /></button>
                        <span className="font-black text-xs">{cart[product.id]}</span>
                        <button onClick={() => !isLimitReached && addToCart(product.id)} className={`p-2 transition-transform active:scale-75 ${isLimitReached ? 'text-gray-200 dark:text-neutral-700' : 'text-blue-600'}`} disabled={isLimitReached}><Plus size={14} /></button>
                      </div>
                    ) : (
                      <Link href={`/product/${product.id}`} className="w-full py-3 bg-gray-950 dark:bg-white text-white dark:text-black rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md text-center block">Купить</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalItems > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <button 
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex justify-between items-center px-8 active:scale-[0.98] transition-all"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] opacity-70 uppercase tracking-widest mb-1">Ваша корзина</span>
              <span className="text-xl tracking-tighter">{totalPrice.toFixed(0)} ₽</span>
            </div>
            <div className="bg-white/20 p-2 rounded-xl"><ShoppingCart size={20} /></div>
          </button>
        </div>
      )}

      {/* Наше новое модальное окно */}
      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        items={orderItems}
        total={totalPrice}
        loading={isCheckoutLoading}
      />

      {/* Модальное окно УСПЕХА */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
               onClick={() => setShowSuccessModal(false)}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2.5rem] p-8 relative z-[111] shadow-2xl text-center"
             >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                  <CheckCircle size={40} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">Заказ принят!</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed mb-8">
                  Спасибо за покупку! <br/>
                  Продавец скоро свяжется с вами для уточнения деталей оплаты и доставки.
                </p>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-green-500 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-lg shadow-green-500/30 active:scale-95 transition-transform"
                >
                  Отлично
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Модальное окно ОШИБКИ */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
               onClick={() => setShowErrorModal(false)}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2.5rem] p-8 relative z-[111] shadow-2xl text-center"
             >
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                  <XCircle size={40} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">Ошибка</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed mb-8">
                  Не удалось оформить заказ. <br/>
                  Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.
                </p>
                <button 
                  onClick={() => setShowErrorModal(false)}
                  className="w-full bg-red-500 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
                >
                  Закрыть
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}