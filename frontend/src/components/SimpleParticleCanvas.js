import React, { useRef } from 'react';
export const SimpleParticleCanvas = ({ simulatorRef, gridLayoutParams, simulationStatus, }) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef();
    const drawParticles = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        return <canvas ref={canvasRef}/>;
    };
    return <div>{drawParticles()}</div>;
};
