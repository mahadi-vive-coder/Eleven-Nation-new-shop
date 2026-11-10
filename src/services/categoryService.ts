import { DEMO_CATEGORIES, HOMEPAGE_CATEGORY_CARDS, CategoryMetadata } from '../data/demoCategories';
import { CategoryCard } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const categoryService = {
  async getCategories(): Promise<CategoryMetadata[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (error) {
          console.error('Supabase categories error:', error);
          return [];
        }
        return (data || []) as CategoryMetadata[];
      } catch (err) {
        console.error('Supabase categories query exception:', err);
        return [];
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
