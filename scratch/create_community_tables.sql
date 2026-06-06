-- 1. 커뮤니티 게시글 테이블 생성
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    category TEXT NOT NULL, -- '자유', '감상평', '공략', '창작'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    author_faction TEXT DEFAULT '협객',
    author_realm TEXT DEFAULT '필부',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "누구나 게시글 조회 가능" ON public.community_posts
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자만 게시글 생성 가능" ON public.community_posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "자신의 게시글만 수정 가능" ON public.community_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "자신의 게시글만 삭제 가능" ON public.community_posts
    FOR DELETE USING (auth.uid() = user_id);


-- 2. 게시글 추천(좋아요) 테이블 생성
CREATE TABLE IF NOT EXISTS public.community_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (post_id, user_id)
);

-- RLS 활성화
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "누구나 좋아요 정보 조회 가능" ON public.community_post_likes
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자만 좋아요 추가 가능" ON public.community_post_likes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "자신의 좋아요만 취소 가능" ON public.community_post_likes
    FOR DELETE USING (auth.uid() = user_id);


-- 3. 게시물 댓글 테이블 생성
CREATE TABLE IF NOT EXISTS public.community_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "누구나 댓글 조회 가능" ON public.community_post_comments
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자만 댓글 작성 가능" ON public.community_post_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "자신의 댓글만 수정 가능" ON public.community_post_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "자신의 댓글만 삭제 가능" ON public.community_post_comments
    FOR DELETE USING (auth.uid() = user_id);
