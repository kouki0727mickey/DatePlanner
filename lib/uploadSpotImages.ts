// lib/uploadSpotImages.ts
import { supabase } from '@/lib/supabaseClient'

/**
 * Spot 画像（複数）を Supabase Storage にアップロードし、
 * 公開URLを返すユーティリティ。
 */
export async function uploadSpotImageFiles(params: {
  spotId: string
  files: File[]
  bucket: string // 例: 'spot-images'
}): Promise<string[]> {
  const { spotId, files, bucket } = params

  const urls: string[] = []

  for (const file of files) {
    // ファイル名衝突を避けるため、タイムスタンプ＋乱数
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
    const path = `spots/${spotId}/${fileName}`

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadErr) throw uploadErr

    // 公開URL（bucketが public の前提）
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    urls.push(data.publicUrl)
  }

  return urls
}
