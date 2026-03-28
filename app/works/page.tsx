import WorkCard from "@/app/components/work/WorkCard";
import { works } from "@/app/data/works";

export default function WorksPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05060b",
        padding: 24,
      }}
    >
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