/**
 * useBlogPosts — fetches blog posts from Supabase blog_posts table.
 * Falls back to static constants data if table is empty or unavailable.
 */

import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { BLOG_POSTS as STATIC_POSTS } from '../constants';
import type { BlogPost } from '../types';

export interface UseBlogPostsOptions {
  category?:  string;
  featured?:  boolean;
  limit?:     number;
  platform?:  'market' | 'bet' | 'both';
}

function mapRow(row: any): BlogPost {
  return {
    id:          row.id,
    slug:        row.slug,
    title:       row.title,
    excerpt:     row.excerpt,
    content:     row.content ?? '',
    category:    row.category,
    tags:        row.tags ?? [],
    author:      row.author ?? 'Xentory IA',
    publishedAt: row.published_at,
    readTime:    row.read_time ?? 3,
    imageEmoji:  row.image_emoji ?? '📰',
    featured:    row.featured ?? false,
  };
}

export function useBlogPosts(opts: UseBlogPostsOptions = {}) {
  const { category, featured, limit = 50, platform } = opts;
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const sb = getSupabase();
        if (!sb) throw new Error('no_supabase');

        let query = sb
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(limit);

        if (category) query = query.eq('category', category);
        if (featured !== undefined) query = query.eq('featured', featured);
        if (platform && platform !== 'both') {
          query = query.or(`platform.eq.${platform},platform.eq.both`);
        }

        const { data, error: sbErr } = await query;
        if (sbErr) throw sbErr;

        if (!data || data.length === 0) {
          // Fall back to static posts filtered by options
          const filtered = STATIC_POSTS.filter(p => {
            if (category && p.category !== category) return false;
            if (featured !== undefined && !!p.featured !== featured) return false;
            return true;
          }).slice(0, limit);
          if (alive) { setPosts(filtered); setLoading(false); }
          return;
        }

        if (alive) { setPosts(data.map(mapRow)); setLoading(false); }
      } catch {
        // Graceful fallback to static data
        const filtered = STATIC_POSTS.filter(p => {
          if (category && p.category !== category) return false;
          if (featured !== undefined && !!p.featured !== featured) return false;
          return true;
        }).slice(0, limit);
        if (alive) { setPosts(filtered); setLoading(false); }
      }
    })();

    return () => { alive = false; };
  }, [category, featured, limit, platform]);

  return { posts, loading, error };
}

export function useBlogPost(slug: string) {
  const [post,    setPost]    = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const sb = getSupabase();
        if (!sb) throw new Error('no_supabase');

        const { data, error: sbErr } = await sb
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (sbErr) throw sbErr;
        if (alive) { setPost(data ? mapRow(data) : null); setLoading(false); }
      } catch {
        const fallback = STATIC_POSTS.find(p => p.slug === slug) ?? null;
        if (alive) { setPost(fallback); setLoading(false); }
      }
    })();

    return () => { alive = false; };
  }, [slug]);

  return { post, loading, error };
}
