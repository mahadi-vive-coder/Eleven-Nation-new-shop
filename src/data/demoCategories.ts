import { CategoryCard } from '../types';

export interface CategoryMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount: number;
  subcategories: { name: string; slug: string }[];
}

export const DEMO_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'casual',
    name: 'Casual Clothing',
    slug: 'casual',
    description: 'Everyday heavyweight essentials engineered for fit, form, and effortless street aesthetics.',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
    itemCount: 14,
    subcategories: [
      { name: 'All Casual', slug: 'all' },
      { name: 'Oversized T-Shirts', slug: 'oversized-tees' },
      { name: 'Classic T-Shirts', slug: 't-shirts' },
      { name: 'Polo Shirts', slug: 'polo-shirts' },
      { name: 'Casual Shirts', slug: 'shirts' },
      { name: 'Heavyweight Hoodies', slug: 'hoodies' },
      { name: 'Sweatshirts', slug: 'sweatshirts' },
    ],
  },
  {
    id: 'jerseys',
    name: 'Football Jerseys',
    slug: 'jerseys',
    description: 'Wear your passion. Authentic club kits, retro legends, and national jerseys with custom name and number printing.',
    image: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80',
    itemCount: 18,
    subcategories: [
      { name: 'All Jerseys', slug: 'all' },
      { name: 'Club Jerseys', slug: 'club' },
      { name: 'National Teams', slug: 'national' },
      { name: 'Retro & Iconic', slug: 'retro' },
      { name: 'Player Editions', slug: 'player' },
      { name: 'Fan Editions', slug: 'fan' },
    ],
  },
];

export const HOMEPAGE_CATEGORY_CARDS: CategoryCard[] = [
  {
    id: 'casual-card',
    title: 'CASUAL COLLECTION',
    subtitle: 'MODERN STREETWEAR',
    description: 'Everyday essentials. Elevated style.',
    ctaText: 'SHOP CASUAL',
    ctaLink: '/shop?category=casual',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    tag: 'NEW DROPS',
  },
  {
    id: 'jerseys-card',
    title: 'FOOTBALL JERSEYS',
    subtitle: 'PITCH TO PAVEMENT',
    description: 'Wear your passion. Represent your team.',
    ctaText: 'SHOP JERSEYS',
    ctaLink: '/shop?category=jerseys',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
    tag: 'CUSTOM PRINTING',
  },
];
