/**
 * Generic alias for useNewsletterImageUrl — works for any newsletter asset
 * kind (image, audio) since the underlying signed-URL flow is bucket-aware,
 * not kind-aware.
 */
export {
  useNewsletterImageUrl as useNewsletterAssetUrl,
  invalidateNewsletterImageUrl as invalidateNewsletterAssetUrl,
} from "./useNewsletterImageUrl";
