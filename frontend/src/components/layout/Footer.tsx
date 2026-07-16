export function Footer() {
  return (
    <footer className="border-t-4 border-[#111] bg-[#F9F9F7] mt-16">
      <div className="mx-auto max-w-screen-xl px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-2">
        <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">
          Edition: Vol 1.0 &nbsp;|&nbsp; YEAP — Your Early AM Practice
        </span>
        <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">
          &copy; {new Date().getFullYear()} &nbsp;|&nbsp; SM-2 Algorithm
        </span>
      </div>
    </footer>
  );
}
