'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Package, LogOut, Image as ImageIcon, Edit2, X, Check, ShoppingCart, Clock, User, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  image: string;
}

interface Order {
  id: number;
  user_id: number;
  user_name: string;
  items: any[];
  total_amount: number;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'add' | 'edit'>('products');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (pData) setProducts(pData);
    
    const { data: oData } = await supabase.from('orders').select('*').order('id', { ascending: false });
    if (oData) setOrders(oData);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') setIsAuthenticated(true);
    else alert('Неверный пароль!');
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) fetchData();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = editingProduct?.image || '';
      if (image) {
        const fileName = `${uuidv4()}.${image.name.split('.').pop()}`;
        await supabase.storage.from('product-images').upload(fileName, image);
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const payload = { name, price: parseFloat(price), old_price: oldPrice ? parseFloat(oldPrice) : null, image: imageUrl };
      
      if (activeTab === 'edit' && editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert([payload]);
      }
      
      setName(''); setPrice(''); setOldPrice(''); setImage(null);
      setActiveTab('products');
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-900 p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white dark:bg-neutral-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm border dark:border-neutral-700">
          <div className="flex justify-center mb-6 text-blue-600 animate-bounce"><Package size={50} /></div>
          <h1 className="text-2xl font-black mb-8 text-center uppercase tracking-tighter">Fashion Admin</h1>
          <input
            type="password"
            placeholder="Пароль доступа"
            className="w-full p-4 border rounded-2xl mb-4 dark:bg-neutral-700 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
            Войти в панель
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-20 font-sans">
      <nav className="bg-white dark:bg-neutral-900 border-b dark:border-neutral-800 p-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Package size={18}/></div>
            УПРАВЛЕНИЕ
          </h1>
          <button onClick={() => setIsAuthenticated(false)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"><LogOut size={22} /></button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        {/* Меню вкладок */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border dark:border-neutral-800 shadow-sm">
          <button onClick={() => setActiveTab('products')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Товары</button>
          <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Заказы ({orders.filter(o => o.status === 'new').length})</button>
          <button onClick={() => { setActiveTab('add'); setName(''); setPrice(''); setOldPrice(''); }} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>+ Добавить</button>
        </div>

        {activeTab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 && <div className="text-center py-20 text-gray-400 uppercase font-bold tracking-widest opacity-30">Заказов пока нет</div>}
            {orders.map(order => (
              <div key={order.id} className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border dark:border-neutral-800 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">Заказ #{order.id}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${order.status === 'new' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {order.status === 'new' ? 'Новый' : 'Завершен'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-black text-gray-800 dark:text-white">
                      <User size={14}/> {order.user_name}
                      <a href={`https://t.me/${order.user_name}`} target="_blank" className="text-blue-500 ml-1"><ExternalLink size={14}/></a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-blue-600">{order.total_amount} ₽</div>
                    <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1"><Clock size={10}/> {new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-2xl p-3 mb-4 space-y-2">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs font-medium">
                      <span className="text-gray-500">{item.name} <span className="text-blue-600 font-bold">x{item.quantity}</span></span>
                      <span className="font-bold">{item.price * item.quantity} ₽</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {order.status === 'new' && (
                    <button onClick={() => updateOrderStatus(order.id, 'done')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-green-600 transition-colors">Завершить</button>
                  )}
                  <button onClick={async () => { if(confirm('Удалить запись о заказе?')) { await supabase.from('orders').delete().eq('id', order.id); fetchData(); } }} className="bg-gray-100 dark:bg-neutral-800 text-gray-400 p-3 rounded-xl hover:text-red-500 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'products' ? (
          <div className="grid grid-cols-1 gap-3">
             {products.map(p => (
               <div key={p.id} className="bg-white dark:bg-neutral-900 p-3 rounded-2xl flex items-center gap-4 border dark:border-neutral-800 shadow-sm group">
                 <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                   <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                 </div>
                 <div className="flex-grow min-w-0">
                   <h3 className="font-black text-sm uppercase tracking-tight truncate">{p.name}</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-blue-600 font-black">{p.price} ₽</span>
                     {p.old_price && <span className="text-gray-300 line-through text-[10px]">{p.old_price} ₽</span>}
                   </div>
                 </div>
                 <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingProduct(p); setName(p.name); setPrice(p.price.toString()); setOldPrice(p.old_price?.toString() || ''); setActiveTab('edit'); }} className="p-3 text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
                    <button onClick={async () => { if(confirm('Удалить товар?')) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-3 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border dark:border-neutral-800 shadow-xl max-w-lg mx-auto">
             <h2 className="text-xl font-black mb-8 uppercase tracking-tighter">{activeTab === 'edit' ? 'Редактирование' : 'Новый товар'}</h2>
             <form onSubmit={handleSaveProduct} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Название вещи</label>
                  <input type="text" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Цена</label>
                    <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={price} onChange={(e) => setPrice(e.target.value)} required />
                   </div>
                   <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Старая цена</label>
                    <input type="number" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-400" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Фотография</label>
                  <div className="relative group">
                    <div className="w-full p-8 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                      <ImageIcon className="text-gray-300 group-hover:text-blue-500 transition-colors" size={40}/>
                      <span className="text-[10px] font-black uppercase text-gray-400 mt-2">{image ? image.name : 'Выбрать файл'}</span>
                    </div>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  {activeTab === 'edit' && <button type="button" onClick={() => setActiveTab('products')} className="flex-1 bg-gray-100 dark:bg-neutral-800 p-4 rounded-2xl font-bold uppercase text-xs">Отмена</button>}
                  <button type="submit" disabled={loading} className="flex-[2] bg-blue-600 text-white p-4 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-blue-500/30">
                    {loading ? 'Загрузка...' : 'Сохранить'}
                  </button>
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}
