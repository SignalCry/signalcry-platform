type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <span className="rounded-l border border-white/20 bg-black px-3 py-1.5 text-base font-bold tracking-tight text-white">
        Signal
      </span>
      <span className="rounded-r border border-white/20 border-l-0 bg-white px-3 py-1.5 text-base font-extrabold tracking-tight text-black">
        X
      </span>
    </span>
  );
}
