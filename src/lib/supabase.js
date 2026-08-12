import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zpkikvgmmbtekbcuqahf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = 'Event_system';

export const fixImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    const storagePath = url.split('/storage/v1/object/public/')[1];
    if (storagePath) {
      return `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
    }
  }
  return url;
};

export const uploadPrizeImage = async (file, pathPrefix = 'prizes') => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('uploadPrizeImage exception:', err);
    return null;
  }
};
