interface SparklineProps {
  points: string;
  color?: string;
  delay?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  points,
  color = '#34c759',
  delay = '0s',
  width = 64,
  height = 32,
}: SparklineProps) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={300}
        strokeDashoffset={300}
        style={{ animation: `drawLine 1.5s ${delay} ease forwards` }}
      />
    </svg>
  );
}
