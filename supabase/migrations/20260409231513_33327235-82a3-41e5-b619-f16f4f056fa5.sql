UPDATE ai_versions
SET system_prompt = system_prompt || E'\n\nKeep every ✅ and ❌ impact line to 15 words or fewer. Be direct and concise.',
    prompt_version = 3,
    version_string = 'AI-sonnet46-P3'
WHERE id = 'c3d3529e-df81-4e3d-a976-9c8fbb419bef';