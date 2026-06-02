export default function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute rounded-full bg-success animate-live-pulse"
        style={{ inset: -3 }}
      />
      <span
        className="relative rounded-full bg-success"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
