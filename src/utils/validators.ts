export function validateTikTokUrl(url: string): boolean {
  if (!url.trim()) return false;
  const u = url.trim();
  return /tiktok\.com\/@[\w.-]+\/video\/\d+/i.test(u) || /vm\.tiktok\.com\/\w+/i.test(u);
}

export function validateMetrics(metrics: Record<string, number>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (metrics.views < 0) errors.views = '播放量不能为负数';
  if (metrics.likes < 0) errors.likes = '点赞数不能为负数';
  if (metrics.likes > metrics.views) errors.likes = '点赞数不能大于播放量';
  if (metrics.shares < 0) errors.shares = '分享数不能为负数';
  if (metrics.comments < 0) errors.comments = '评论数不能为负数';
  if (metrics.saves < 0) errors.saves = '收藏数不能为负数';
  return errors;
}
