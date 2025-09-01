import React from 'react';
import * as Plotly from 'plotly.js';
import type { PlotData, Layout, Config } from 'plotly.js';

interface PlotlyChartProps {
  data?: Partial<PlotData>[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  style?: React.CSSProperties;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data = [],
  layout = {},
  config = {},
  style = { width: '100%', height: '100%' }
}) => {
  const plotRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (plotRef.current) {
      const defaultLayout: Partial<Layout> = {
        margin: { l: 50, r: 50, t: 50, b: 50 },
        font: { family: 'Arial, sans-serif', size: 12 },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        ...layout
      };

      const defaultConfig: Partial<Config> = {
        displayModeBar: true,
        responsive: true,
        ...config
      };

      Plotly.newPlot(plotRef.current, data, defaultLayout, defaultConfig);
    }
  }, [data, layout, config]);

  return <div ref={plotRef} style={style} />;
};

export default PlotlyChart;
