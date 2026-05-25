export function mapPexelsError(code: string): string {
  switch (code) {
    case "pexels_auth_failed": return "Pexels API key is invalid. Contact support.";
    case "pexels_rate_limited": return "Pexels rate limit reached. Try again in a few minutes.";
    case "pexels_api_failure": return "Pexels search failed. Try again.";
    case "pexels_response_unparseable": return "Pexels returned an unexpected response.";
    case "pexels_timeout": return "Pexels took too long to respond. Try again.";
    case "query_required": return "Type a search query.";
    case "query_too_long": return "Search query is too long.";
    case "src_large_url_host_not_allowed": return "That image source isn't supported.";
    case "pexels_image_too_large": return "That image is too large.";
    case "pexels_unsupported_mime": return "That image format isn't supported.";
    case "pexels_head_timeout":
    case "pexels_fetch_timeout": return "Pexels image fetch timed out. Try a different image.";
    case "pexels_head_failed":
    case "pexels_fetch_failed": return "Failed to download image from Pexels.";
    case "storage_upload_failed": return "Failed to save the image. Try again.";
    case "request_asset_upload_failed": return "Failed to register the image. Try again.";
    case "finalize_asset_upload_failed": return "Failed to finalize the image. Try again.";
    case "article_not_found": return "This article no longer exists.";
    case "IMPERSONATION_DENIED": return "Image picker is disabled during impersonation.";
    case "super_admin_required": return "You don't have permission to pick images.";
    default: return "Something went wrong. Try again.";
  }
}
