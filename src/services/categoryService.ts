import { DEMO_CATEGORIES, HOMEPAGE_CATEGORY_CARDS, CategoryMetadata } from '../data/demoCategories';
import { CategoryCard } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const categoryService = {
  async getCategories(): Promise<CategoryMetadata[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data && data.length > 0) return data as CategoryMetadata[];
      } catch (err) {
        console.warn('Supabase categories fallback:', err);
      }
    }
    return DEMO_CATEGORIES;
  },

  async getHomepageCategoryCards(): Promise<CategoryCard[]> {
    return HOMEPAGE_CATEGORY_CARDS;
  },

  async getCategoryBySlug(slug: string): Promise<CategoryMetadata | null> {
    const categories = await this.getCategories();
    return categories.find((c) => c.slug === slug) || null;
  }
};
