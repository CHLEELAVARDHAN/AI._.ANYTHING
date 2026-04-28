import React, { useMemo, memo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, 
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend
} from 'recharts';
import { motion } from 'motion/react';

interface ChartData {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar';
  data: any[];
  title?: string;
  is3D?: boolean;
}

const COLORS = ['#eab308', '#ca8a04', '#fbbf24', '#fcd34d', '#fef3c7', '#d97706'];

export const DataVisualization: React.FC<{ json: string }> = memo(({ json }) => {
  const chartData = useMemo(() => {
    try {
      // Pre-processing to handle common LLM JSON errors
      let processedJson = json.trim();
      
      // Remove potential markdown code blocks if AI nested them
      if (processedJson.startsWith('```')) {
        processedJson = processedJson.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '');
      }

      // 1. Remove trailing commas in objects or arrays
      processedJson = processedJson.replace(/,(\s*[\]}])/g, '$1');

      // 2. Fix literal newlines in string values (unsupported by JSON.parse)
      processedJson = processedJson.replace(/"([^"]*)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n') + '"';
      });

      return JSON.parse(processedJson) as ChartData;
    } catch (e) {
      // Fallback: try to find anything between { and } if broad parsing failed
      try {
        const start = json.indexOf('{');
        const end = json.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          const slice = json.slice(start, end + 1);
          return JSON.parse(slice) as ChartData;
        }
      } catch (innerError) {
        // Silently fail
      }
      return null;
    }
  }, [json]);

  if (!chartData) return null;

  const { type, data, title, is3D } = chartData;

  const renderChart = () => {
    const textColor = "var(--text-primary)";
    const axisColor = "rgba(161, 161, 170, 0.5)"; // zinc-400 / zinc-500 equivalent
    const gridColor = "rgba(161, 161, 170, 0.2)";
    const tooltipStyle = { backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', fontSize: '10px', color: textColor, backdropFilter: 'blur(12px)' };

    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(161, 161, 170, 0.1)'}} />
            <Bar dataKey="value" fill="var(--primary-color)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="var(--primary-color)" strokeWidth={3} dot={{ fill: 'var(--primary-color)', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} isAnimationActive={false} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis type="number" dataKey="x" name="x" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="y" name="y" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} name="z" />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: axisColor }} contentStyle={tooltipStyle} />
            <Scatter name="Data" data={data} fill="var(--primary-color)" isAnimationActive={false} />
          </ScatterChart>
        );
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="subject" stroke={axisColor} fontSize={10} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke={axisColor} fontSize={8} />
            <Radar
              name="Value"
              dataKey="value"
              stroke="var(--primary-color)"
              fill="var(--primary-color)"
              fillOpacity={0.4}
              isAnimationActive={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`my-6 p-4 rounded-[24px] glass-panel relative overflow-hidden group ${is3D ? 'perspective-1000' : ''}`}
      style={is3D ? { perspective: '1000px' } : {}}
    >
      {is3D && (
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
      )}
      
      {title && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</h3>
          <div className="h-0.5 w-8 bg-primary mt-1 rounded-full" />
        </div>
      )}

      <div 
        className={`w-full h-64 transition-transform duration-700 ease-out ${is3D ? 'group-hover:rotate-x-12 group-hover:rotate-y-6 rotate-x-6' : ''}`}
        style={is3D ? { transformStyle: 'preserve-3d', transform: 'rotateX(8deg) rotateY(-5deg)' } : {}}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() || <div className="text-zinc-500 text-xs italic">Unsupported chart type</div>}
        </ResponsiveContainer>
      </div>

      {is3D && (
        <div className="mt-4 flex items-center justify-end">
          <div className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary uppercase tracking-tighter">
            3D Rendering Active
          </div>
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.json === nextProps.json) return true;
  
  const extract = (j: string) => {
    const s = j.indexOf('{');
    const e = j.lastIndexOf('}');
    return s !== -1 && e !== -1 ? j.slice(s, e + 1) : j;
  };
  
  return extract(prevProps.json) === extract(nextProps.json);
});
