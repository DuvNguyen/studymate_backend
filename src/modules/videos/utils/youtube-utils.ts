export class YoutubeUtils {
  /**
   * Chuyển đổi định dạng thời lượng ISO 8601 của YouTube (vd: PT15M33S) sang số giây.
   * @param durationStr Chuỗi thời lượng ISO 8601
   * @returns Tổng số giây
   */
  static parseDurationToSeconds(
    durationStr: string | null | undefined,
  ): number {
    if (!durationStr) return 0;

    // Biểu thức chính quy tách Giờ, Phút, Giây
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1], 10) || 0;
    const minutes = parseInt(match[2], 10) || 0;
    const seconds = parseInt(match[3], 10) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }
}
