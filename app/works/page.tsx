import TopBar from "@/app/components/TopBar";
import WorkCard from "@/app/components/work/WorkCard";
import { works } from "@/app/data/works";

export default function WorksPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: `
          linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)),
          url("/background.jpg") center / cover no-repeat fixed
        `,
        color: "white",
        padding: "20px 16px",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      <TopBar />
      <h1
        style={{
          color: "#fff",
          fontSize: 32,
          fontWeight: 900,
          marginBottom: 24,
        }}
      >
        전체 작품
      </h1>

      <div style={{ display: "grid", gap: 24 }}>
        {works.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </main>
  );
}