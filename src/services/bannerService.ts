import { DEMO_BANNERS, FALLBACK_BANNER, CASUAL_FEATURED_CAMPAIGN, FOOTBALL_FEATURED_CAMPAIGN } from '../data/demoBanners';
import { Banner } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const bannerService = {
  /**
   * Retrieves all active banners sorted by sort_order
   */
  async getActiveBanners(): Promise<Banner[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .or(`start_at.is.null,start_at.lte.${now}`)
          .or(`end_at.is.null,end_at.gte.${now}`)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as Banner[];
        }
      } catch (err) {
        console.warn('Supabase active banners fallback to demo data:', err);
      }
    }

    // Filter local active banners and sort
    const now = new Date();
    const active = DEMO_BANNERS.filter((b) => {
      if (!b.is_active) return false;
      if (b.start_at && new Date(b.start_at) > now) return false;
      if (b.end_at && new Date(b.end_at) < now) return false;
      return true;
    }).sort((a, b) => a.sort_order - b.sort_order);

    return active.length > 0 ? active : [FALLBACK_BANNER];
  },

  /**
   * Get single default banner for simple embeds
   */
  async getHeroBanner(): Promise<Banner> {
    const banners = await this.getActiveBanners();
    return banners[0] || FALLBACK_BANNER;
  },

  async getCasualCampaign() {
    return CASUAL_FEATURED_CAMPAIGN;
  },

  async getFootballCampaign() {
    return FOOTBALL_FEATURED_CAMPAIGN;
  }
};
