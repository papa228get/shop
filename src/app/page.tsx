'use client';

import { useState } from 'react';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

const products: Product[] = [
  { id: 1, name: 'Streetwear Hoodie', price: 45, image: 'https://placehold.co/400x400/222/fff?text=Hoodie' },
  { id: 2, name: 'Slim Fit Jeans', price: 30, image: 'https://placehold.co/400x400/333/fff?text=Jeans' },
  { id: 3, name: 'Urban Sneakers', price: 60, image: 'https://placehold.co/400x400/444/fff?text=Sneakers' },
  { id: 4, name: 'Classic Cap', price: 15, image: 'https://placehold.co/400x400/555/fff?text=Cap' },
  { id: 5, name: 'Oversized Tee', price: 25, image: 'https://placehold.co/400x400/666/fff?text=T-Shirt' },
  { id: 6, name: 'Bomber Jacket', price: 80, image: 'https://placehold.co/400x400/777/fff?text=Jacket' },
];

export default function Home() {
  const [cart, setCart] = useState<{ [key: number]: number }>({});

  const addToCart = (id: number) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 0) {
        newCart[id]--;
        if (newCart[id] === 0) delete newCart[id];
      }
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((total, [id, qty]) => {
    const product = products.find(p => p.id === Number(id));
    return total + (product ? product.price * qty : 0);
  }, 0);

  return (
    <main className="pb-24 pt-4 px-4 min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fashion Store</h1>
        <div className="bg-blue-600 text-white p-2 rounded-full">
          <ShoppingBag size={24} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="relative aspect-square w-full">
               <Image 
                 src={product.image} 
                 alt={product.name}
                 fill
                 className="object-cover"
               />
            </div>
            <div className="p-3 flex flex-col flex-grow">
              <h3 className="font-medium text-sm truncate">{product.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">${product.price}</p>
              
              <div className="mt-auto">
                {cart[product.id] ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1">
                    <button 
                      onClick={() => removeFromCart(product.id)}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded text-blue-600 dark:text-blue-400"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-semibold text-sm">{cart[product.id]}</span>
                    <button 
                      onClick={() => addToCart(product.id)}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded text-blue-600 dark:text-blue-400"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => addToCart(product.id)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4">
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg flex justify-between items-center px-6"
            onClick={() => {
                // Here we will eventually send data to Telegram
                if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                    window.Telegram.WebApp.showPopup({
                        title: 'Checkout',
                        message: `Total: $${totalPrice}`,
                        buttons: [{type: 'ok'}]
                    });
                } else {
                    alert(`Checkout Total: $${totalPrice}`);
                }
            }}
          >
            <span>View Order</span>
            <span>${totalPrice}</span>
          </button>
        </div>
      )}
    </main>
  );
}