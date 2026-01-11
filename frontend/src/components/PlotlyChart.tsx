import React from 'react';
import * as Plotly from 'plotly.js';
const PlotlyChart = ({ data = [], layout = {}, config = {}, style = { width: '100%', height: '100%' } }) => {
    const plotRef = React.useRef(null);
    React.useEffect(() => {
        if (plotRef.current) {
            const defaultLayout = {
                margin: { l: 50, r: 50, t: 50, b: 50 },
                font: { family: 'Arial, sans-serif', size: 12 },
                paper_bgcolor: 'white',
                plot_bgcolor: 'white',
                ...layout
            };
            const defaultConfig = {
                displayModeBar: true,
                responsive: true,
                ...config
            };
            Plotly.newPlot(plotRef.current, data, defaultLayout, defaultConfig);
        }
    }, [data, layout, config]);
    return <div ref={plotRef} style={style}/>;
};
export default PlotlyChart;
