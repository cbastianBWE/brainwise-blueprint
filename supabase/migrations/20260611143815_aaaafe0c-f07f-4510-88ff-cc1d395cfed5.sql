-- Revoke column-level SELECT on author_user_id from anon. No anon code
-- path reads this table directly or via embed (marketing uses RPCs:
-- get_article_for_reader, list_articles_for_archive). Authenticated
-- super-admin reads are unaffected.
REVOKE SELECT (author_user_id) ON public.newsletter_article_authors FROM anon;

-- Pin search_path on the three project-owned functions. Bodies reference
-- no schema objects (pure now() / jsonb_build_*), so '' is safe and
-- strictest. Extension functions (pg_trgm: similarity, gtrgm_*) are
-- intentionally untouched.
ALTER FUNCTION public.ops_get_merge_tag_catalog() SET search_path = '';
ALTER FUNCTION public._touch_newsletter_subscribers_updated_at() SET search_path = '';
ALTER FUNCTION public._touch_newsletter_articles_updated_at() SET search_path = '';