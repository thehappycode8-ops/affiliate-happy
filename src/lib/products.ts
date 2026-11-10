'use client';

import { useEffect, useState } from 'react';

export interface Product {
  id: string;
  name: string;
  sub: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export { MAX_PRODUCTS } from './types';

/* แคชไว้ในหน่วยความจำ เปิดหลายการ์ดในหน้าเดียวก็ยิง API ครั้งเดียว */
let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;
const listeners = new Set<(p: Product[]) => void>();

async function fetchProducts(): Promise<Product[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch('/api/products')
      .then((r) => r.json())
      .then((j) => {
        cache = (j.data || []) as Product[];
        listeners.forEach((fn) => fn(cache!));
        return cache;
      })
      .catch(() => [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** ล้างแคชหลังแอดมินแก้ข้อมูลสินค้า */
export function clearProductCache() {
  cache = null;
}

/** รายการสินค้าที่เปิดใช้งาน — ใช้ใน client component */
export function useProducts(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    const onUpdate = (p: Product[]) => {
      if (alive) setProducts(p);
    };
    listeners.add(onUpdate);
    fetchProducts().then((p) => {
      if (!alive) return;
      setProducts(p);
      setLoading(false);
    });
    return () => {
      alive = false;
      listeners.delete(onUpdate);
    };
  }, []);

  return { products, loading };
}

export function findProduct(products: Product[], name: string): Product | undefined {
  return products.find((p) => p.name === name);
}
