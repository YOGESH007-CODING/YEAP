export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-16">
      <div className="mx-auto max-w-screen-xl px-4 py-6 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-wider text-[#8A8F98]/60">
          YEAP v1.0 &middot; SM-2 Algorithm
        </span>
        <span className="font-mono text-[10px] tracking-wider text-[#8A8F98]/60">
          &copy; {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
