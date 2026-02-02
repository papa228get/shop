'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { ArrowLeft, ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  old_price?: number;
  images: string[];
  quantity: number;
  is_preorder: boolean;
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { cart, addToCart, removeFromCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if (data) setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!product) return <div className="p-10 text-center text-gray-500 font-bold">Товар не найден</div>;

  const inCart = cart[product.id] || 0;
  const images = product.images || [];
  const isOutOfStock = product.quantity <= 0 && !product.is_preorder;
  const isLimitReached = !product.is_preorder && inCart >= product.quantity;

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentImg((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      return next;
    });
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? '100%' : '-100%',
        opacity: 0
      };
    }
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = swipePower(offset.x, velocity.x);

    // Свайп (быстрое движение) или перетаскивание (расстояние > 50px)
    if (swipe < -swipeConfidenceThreshold || offset.x < -50) {
      paginate(1);
    } else if (swipe > swipeConfidenceThreshold || offset.x > 50) {
      paginate(-1);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 pb-24 font-sans">
      <div className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
        <button onClick={() => router.back()} className="bg-gray-100 dark:bg-neutral-800 p-2.5 rounded-2xl text-gray-800 dark:text-white"><ArrowLeft size={20} /></button>
        <span className="text-xs font-black uppercase tracking-widest opacity-50">{product.category}</span>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full aspect-[4/5] bg-gray-50 dark:bg-neutral-900 mt-16 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentImg}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            onClick={() => setIsLightboxOpen(true)}
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image 
              src={images[currentImg] || 'https://placehold.co/400x500?text=No+Image'} 
              alt={product.name} 
              fill 
              className={`object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
              priority
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
            <span className="bg-white text-black text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest">Нет в наличии</span>
          </div>
        )}

        {images.length > 1 && !isOutOfStock && (
          <>
            <button onClick={(e) => { e.stopPropagation(); paginate(-1); }} className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-colors z-30"><ChevronLeft size={24}/></button>
            <button onClick={(e) => { e.stopPropagation(); paginate(1); }} className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-colors z-30"><ChevronRight size={24}/></button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
              {images.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentImg ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}

        {product.old_price && product.old_price > product.price && !isOutOfStock && (
          <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg z-20">
            -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
          </div>
        )}
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-black mb-2 text-gray-900 dark:text-white uppercase tracking-tighter">{product.name}</h1>
        {product.is_preorder && (
          <div className="mb-4">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold mr-2 px-3 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300">
                ПРЕДЗАКАЗ
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl font-black text-blue-600">{product.price} ₽</span>
          {product.old_price && <span className="text-lg text-gray-400 line-through font-bold">{product.old_price} ₽</span>}
        </div>
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Описание</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium whitespace-pre-wrap">{product.description}</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-neutral-900 z-40">
        {isOutOfStock ? (
          <button disabled className="w-full bg-gray-100 dark:bg-neutral-800 text-gray-400 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest cursor-not-allowed">
            Товар закончился
          </button>
        ) : inCart > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center bg-gray-100 dark:bg-neutral-900 rounded-[2rem] p-1 border dark:border-neutral-800">
              <button onClick={() => removeFromCart(product.id)} className="p-4 text-red-500"><Minus size={20} strokeWidth={3} /></button>
              <span className="w-12 text-center font-black text-lg">{inCart}</span>
              <button 
                onClick={() => !isLimitReached && addToCart(product.id)} 
                className={`p-4 ${isLimitReached ? 'text-gray-300' : 'text-blue-600'}`}
                disabled={isLimitReached}
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
            <button 
              onClick={() => router.push('/')} 
              className="flex-1 bg-gray-950 dark:bg-white text-white dark:text-black py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl"
            >
              КУПИТЬ
            </button>
          </div>
        ) : (
          <button onClick={() => addToCart(product.id)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex justify-center items-center gap-3"><ShoppingCart size={18} strokeWidth={3} /> Добавить в корзину</button>
        )}
      </div>

      {/* LIGHTBOX (Полноэкранный просмотр) */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          >
            <button 
              onClick={() => setIsLightboxOpen(false)} 
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-[101]"
            >
              <X size={32} />
            </button>

            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
               <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={currentImg}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={handleDragEnd}
                    className="absolute w-full h-auto max-h-screen aspect-auto flex items-center justify-center"
                >
                    <div className="relative w-full h-[80vh]">
                        <Image 
                            src={images[currentImg]} 
                            alt={product.name} 
                            fill 
                            className="object-contain"
                            priority
                            draggable={false}
                        />
                    </div>
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all ${i === currentImg ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
                    ))}
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
