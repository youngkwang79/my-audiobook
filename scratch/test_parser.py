import re
import sys
import json

log_path = r"C:\Users\owner\.gemini\antigravity-ide\brain\b2c01393-3f3b-4699-a5eb-06d9e5e907ce\.system_generated\tasks\task-350.log"

with open(log_path, "r", encoding="utf-8") as f:
    log_content = f.read()

# Extract Raw Response
raw_match = re.search(r"Raw Response: (.*)", log_content, re.DOTALL)
if not raw_match:
    print("Could not find Raw Response in log")
    sys.exit(1)

raw_text = raw_match.group(1).strip()

def improved_fallback_regex_parse(raw_text):
    import re
    data = {}
    
    # Extract title
    title_match = re.search(r'"title"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if title_match:
        data["title"] = title_match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
        
    # Extract meta_description
    meta_match = re.search(r'"meta_description"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if meta_match:
        data["meta_description"] = meta_match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
        
    # Extract slug
    slug_match = re.search(r'"slug"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
    if slug_match:
        data["slug"] = slug_match.group(1).strip()
        
    # Extract tags
    tags_match = re.search(r'"tags"\s*:\s*\[(.*?)\]', raw_text, re.DOTALL)
    if tags_match:
        tags_str = tags_match.group(1)
        data["tags"] = [t.strip().strip('"\'') for t in tags_str.split(",") if t.strip()]
        
    # Extract content_markdown (safely matching to the end of string if cut off)
    content_match = re.search(r'"content_markdown"\s*:\s*"(.*)', raw_text, re.DOTALL)
    if content_match:
        content_str = content_match.group(1).strip()
        
        # Clean trailing JSON artifacts if they exist
        # If it ends with closing quote + optional spaces + closing braces/fences
        # e.g., '",\n  "json_ld": ... }' or '"}' or '```'
        # Since content_markdown is usually followed by json_ld or is the last field,
        # let's clean up if it ends with json_ld or braces
        
        # Remove trailing markdown fence if present
        if content_str.endswith("```"):
            content_str = content_str[:-3].strip()
            
        # If the string ends with a double quote that is not escaped, or we can strip trailing braces
        # Let's clean up trailing JSON structures like:
        # " }
        # }
        # or similar
        content_str = re.sub(r'"\s*\}\s*$', '', content_str) # end of JSON
        content_str = re.sub(r'"\s*,\s*"json_ld".*$', '', content_str, flags=re.DOTALL) # if followed by json_ld
        
        # Strip trailing unescaped double quote if it's there
        if content_str.endswith('"') and not content_str.endswith('\\"'):
            content_str = content_str[:-1]
            
        data["content_markdown"] = content_str.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
        
    return data

data = improved_fallback_regex_parse(raw_text)
print("Parsed Title:", data.get("title"))
print("Parsed content_markdown length:", len(data.get("content_markdown", "")))
print("Parsed content_markdown ends with:", repr(data.get("content_markdown", "")[-200:]))
