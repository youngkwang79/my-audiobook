const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let url = '';
let serviceKey = '';
let wpUrl = '';
let wpUser = '';
let wpAppPw = '';
let bloggerClientId = '';
let bloggerClientSecret = '';
let bloggerBlogId = '';

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.trim().split('=');
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = v;
      if (k === 'WP_URL') wpUrl = v;
      if (k === 'WP_ADMIN_USERNAME') wpUser = v;
      if (k === 'WP_APPLICATION_PASSWORD') wpAppPw = v;
      if (k === 'BLOGGER_CLIENT_ID') bloggerClientId = v;
      if (k === 'BLOGGER_CLIENT_SECRET') bloggerClientSecret = v;
      if (k === 'BLOGGER_BLOG_ID') bloggerBlogId = v;
    }
  });
}

url = url.replace(/^['"]|['"]$/g, '');
serviceKey = serviceKey.replace(/^['"]|['"]$/g, '');

const supabase = createClient(url, serviceKey);

async function getBloggerAccessToken() {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  // We'll read the refresh token from .env.local (GOOGLE_REFRESH_TOKEN)
  let refreshToken = '';
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('GOOGLE_REFRESH_TOKEN=')) {
      refreshToken = line.split('GOOGLE_REFRESH_TOKEN=')[1].trim();
    }
  });
  
  const payload = new URLSearchParams({
    client_id: bloggerClientId,
    client_secret: bloggerClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  
  const res = await axios.post(tokenUrl, payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data.access_token;
}

async function main() {
  try {
    // 1. Get WP Hosted Cover Image URL (we created post 665, featured media was 663)
    // Let's get the URL of the generated cover that we uploaded to WP:
    // It was: https://blog.murimbook.com/wp-content/uploads/2026/07/electricity_save_wp_cover_1783018303623.jpg
    const imgUrl = "https://blog.murimbook.com/wp-content/uploads/2026/07/electricity_save_wp_cover_1783018303623.jpg";
    
    // 2. Refresh Blogger token
    const token = await getBloggerAccessToken();
    
    // 3. Fetch current Blogger post (Post ID: 9122895692671824192)
    const postId = "9122895692671824192";
    const getUrl = `https://www.googleapis.com/blogger/v3/blogs/${bloggerBlogId}/posts/${postId}`;
    const getRes = await axios.get(getUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let contentHtml = getRes.data.content;
    
    // 4. Inject Image Tag at the very beginning of the contentHtml
    const imgTag = `<div style="text-align: center; margin-bottom: 24px;">
      <img src="${imgUrl}" alt="전기세 절약 꿀팁 대표 이미지" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #ddd;" />
    </div>`;
    
    if (!contentHtml.includes(imgUrl)) {
      contentHtml = imgTag + contentHtml;
    }
    
    // 5. Update post back on Blogger
    const updateUrl = `https://www.googleapis.com/blogger/v3/blogs/${bloggerBlogId}/posts/${postId}`;
    const updatePayload = {
      ...getRes.data,
      content: contentHtml
    };
    
    await axios.put(updateUrl, updatePayload, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Successfully injected title cover image into Google Blogger draft!");
  } catch (err) {
    console.error("Error updating Blogger post with image:", err.message);
  }
}

main();
