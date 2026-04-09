UPDATE ai_versions
SET 
  system_prompt = REPLACE(
    system_prompt,
    'Keep every ✅ and ❌ impact line to 15 words or fewer. Be direct and concise.',
    'Keep every ✅ and ❌ impact line to 25 words or fewer. Be direct and concise.'
  ),
  prompt_version = 3,
  version_string = 'AI-sonnet46-P3'
WHERE is_active = true;