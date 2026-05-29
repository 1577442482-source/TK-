import type { Comment } from '../types';

const PYTHON_API = 'http://127.0.0.1:8765';

export interface TikTokVideoData {
  url: string;
  description: string;
  creatorHandle: string;
  hashtags: string[];
  duration: number;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  commentsList: Comment[];
  thumbnailUrl: string;
  source: 'oembed' | 'scraper' | 'manual';
  _apiError?: string;
  dynamicCover?: string;
  postedAt?: string;
  musicTitle?: string;
  musicAuthor?: string;
  musicOriginal?: boolean;
  creatorFollowers?: number;
  creatorFollowing?: number;
  creatorHearts?: number;
  creatorVideos?: number;
  creatorVerified?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  contentCategories?: string[];
  videoDownloadUrl?: string;
}

export interface ScraperProvider {
  name: string;
  fetchVideoData: (videoUrl: string) => Promise<TikTokVideoData | null>;
}

// ---- URL parser ----

export function parseTikTokUrl(url: string): { videoId: string; username: string } | null {
  const match = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
  if (match) return { username: match[1], videoId: match[2] };

  const shortMatch = url.match(/vm\.tiktok\.com\/(\w+)/i);
  if (shortMatch) return { username: '', videoId: shortMatch[1] };

  return null;
}

// ---- oEmbed fetcher (free, no auth) ----

async function fetchOEmbed(videoUrl: string): Promise<{
  title: string;
  authorName: string;
  thumbnailUrl: string;
} | null> {
  try {
    const resp = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || '',
      authorName: data.author_name || '',
      thumbnailUrl: data.thumbnail_url || '',
    };
  } catch {
    return null;
  }
}

// ---- Hashtag extractor ----

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w一-鿿]+/g);
  return matches ? [...new Set(matches.map(t => t.replace(/^#/, '')))] : [];
}

// ---- Python API scraper (tiktokapipy) ----

const pythonScraper: ScraperProvider = {
  name: 'tiktokapipy',
  fetchVideoData: async (videoUrl: string) => {
    try {
      const resp = await fetch(`${PYTHON_API}/api/fetch?url=${encodeURIComponent(videoUrl)}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      if (!json.success || !json.data) return null;
      const d = json.data;

      // If the API returned an error message, relay it
      if (d._error) {
        console.warn('[tiktokFetcher] API error:', d._error);
        return {
          url: videoUrl,
          description: '',
          creatorHandle: '',
          hashtags: [],
          duration: 0,
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          saves: 0,
          commentsList: [],
          thumbnailUrl: '',
          source: 'scraper',
          _apiError: d._error,
        };
      }
      // Map scraped comments to frontend Comment type, top 20 by likes
      const scrapedComments: Comment[] = (d.commentsList || [])
        .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 20)
        .map((c: any, i: number) => ({
        id: `scraped-${i}-${Date.now()}`,
        text: c.text || '',
        username: c.username || '',
        likes: c.likes || 0,
        postedAt: c.timestamp ? new Date(c.timestamp * 1000).toISOString() : undefined,
        sentiment: 'neutral' as const,
        sentimentScore: 0,
        themes: [],
        isQuestion: (c.text || '').includes('?') || (c.text || '').includes('？'),
      }));
      return {
        url: d.url || videoUrl,
        description: d.description || '',
        creatorHandle: d.creatorHandle || '',
        hashtags: d.hashtags || [],
        duration: d.duration || 0,
        views: d.views || 0,
        likes: d.likes || 0,
        shares: d.shares || 0,
        comments: d.comments || 0,
        saves: d.saves || 0,
        commentsList: scrapedComments,
        thumbnailUrl: d.thumbnailUrl || '',
        source: 'scraper',
        dynamicCover: d.dynamicCover || undefined,
        postedAt: d.postedAt || undefined,
        musicTitle: d.musicTitle || undefined,
        musicAuthor: d.musicAuthor || undefined,
        musicOriginal: d.musicOriginal || undefined,
        creatorFollowers: d.creatorFollowers || undefined,
        creatorFollowing: d.creatorFollowing || undefined,
        creatorHearts: d.creatorHearts || undefined,
        creatorVideos: d.creatorVideos || undefined,
        creatorVerified: d.creatorVerified || undefined,
        videoWidth: d.videoWidth || undefined,
        videoHeight: d.videoHeight || undefined,
        contentCategories: d.contentCategories || undefined,
        videoDownloadUrl: d.videoDownloadUrl || undefined,
      };
    } catch {
      return null;
    }
  },
};

// ---- Main fetcher ----

export async function fetchTikTokVideoData(
  videoUrl: string,
  scraper?: ScraperProvider
): Promise<TikTokVideoData | null> {
  const emptyData = (source: TikTokVideoData['source']): TikTokVideoData => ({
    url: videoUrl,
    description: '',
    creatorHandle: '',
    hashtags: [],
    duration: 0,
    views: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    saves: 0,
    commentsList: [],
    thumbnailUrl: '',
    source,
  });

  // 1. Try Python scraper first (full data)
  try {
    const scraped = await pythonScraper.fetchVideoData(videoUrl);
    if (scraped) return scraped;
  } catch { /* fall through */ }

  // 2. Try custom scraper if provided
  if (scraper) {
    const scraped = await scraper.fetchVideoData(videoUrl);
    if (scraped) return scraped;
  }

  // 3. Fallback to oEmbed (basic data, free)
  const oembed = await fetchOEmbed(videoUrl);

  if (oembed) {
    const hashtags = extractHashtags(oembed.title);
    const cleanTitle = oembed.title.replace(/#[\w一-鿿]+/g, '').trim();

    return {
      ...emptyData('oembed'),
      description: cleanTitle,
      creatorHandle: oembed.authorName.replace(/^@/, ''),
      hashtags,
      thumbnailUrl: oembed.thumbnailUrl,
    };
  }

  return null;
}
