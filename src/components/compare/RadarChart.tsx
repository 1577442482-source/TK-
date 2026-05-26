import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Props {
  data: {
    metric: string;
    values: Record<string, number>;
  }[];
  videoLabels: Record<string, string>;
  colors?: string[];
}

const DEFAULT_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b'];

type ChartDataPoint = { metric: string } & Record<string, number>;

function normalizeData(data: Props['data']): ChartDataPoint[] {
  const maxValues: Record<string, number> = {};
  for (const row of data) {
    const vals = Object.values(row.values);
    maxValues[row.metric] = Math.max(...vals, 1);
  }

  return data.map(row => {
    const entry: ChartDataPoint = { metric: row.metric } as ChartDataPoint;
    for (const [id, val] of Object.entries(row.values)) {
      entry[id] = Math.round((val / maxValues[row.metric]) * 100);
    }
    return entry;
  });
}

export default function RadarChartView({ data, videoLabels, colors = DEFAULT_COLORS }: Props) {
  if (data.length < 3) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-sm text-slate-400">
        需要至少 3 个指标才能生成雷达图
      </div>
    );
  }

  const normalized = normalizeData(data);
  const ids = Object.keys(videoLabels);

  // Truncate long metric names
  const chartData = normalized.map(d => ({
    ...d,
    metric: d.metric.length > 6 ? d.metric.slice(0, 6) + '..' : d.metric,
  }));

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">多维雷达图</h3>
      <ResponsiveContainer width="100%" height={360}>
        <RechartsRadar data={chartData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#6b7d8e', fontSize: 12, fontFamily: 'Geist' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {ids.map((id, i) => (
            <Radar
              key={id}
              name={videoLabels[id] || id}
              dataKey={id}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.08}
              strokeWidth={2}
              strokeOpacity={0.7}
            />
          ))}
          <Legend
            wrapperStyle={{ fontFamily: 'Geist', fontSize: 12 }}
            iconType="circle"
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
