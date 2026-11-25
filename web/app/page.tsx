import Practice from "@/components/Practice";

export default function Home() {
  return (
    <main className="wrap">
      <h1>SayIt</h1>
      <p className="sub">Read your own text aloud and see how your pace, pauses and intonation compare with natural English.</p>
      <Practice />
    </main>
  );
}
