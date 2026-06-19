import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = params;

  const { data: post, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  // Format paragraphs
  const paragraphs = post.content.split("\n");

  return (
    <main className="post-detail-root">
      <title>{post.title} - 강호게시판 창작소설</title>
      <style>{`
        body {
          background-color: #0b0b12;
          color: #f3f4f6;
          margin: 0;
          padding: 0;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .post-detail-root {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 16px 80px;
        }
        .back-link {
          display: inline-block;
          color: #ffd700;
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 20px;
        }
        article {
          background: #141217;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
        }
        .category {
          color: #ffd700;
          font-weight: bold;
          font-size: 13px;
          text-transform: uppercase;
        }
        h1 {
          font-size: 24px;
          margin: 8px 0 16px;
          line-height: 1.3;
        }
        .meta {
          font-size: 13px;
          color: #8c8c96;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.8;
          color: #e4e4e7;
          margin-bottom: 16px;
          text-align: justify;
        }
      `}</style>
      
      <a href="/community" className="back-link">← 강호게시판 목록으로</a>
      
      <article>
        <div className="category">[{post.category}]</div>
        <h1>{post.title}</h1>
        <div className="meta">
          작성자: {post.username} | 작성일: {new Date(post.created_at).toLocaleString("ko-KR")}
        </div>
        <div className="content">
          {paragraphs.map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
