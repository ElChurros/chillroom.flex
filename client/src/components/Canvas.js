import React from 'react'
import useCanvas from '../hooks/useCanvas'

const _predraw = (context) => {
    context.save()
    const { width, height } = context.canvas
    context.clearRect(0, 0, width, height)
}

const _draw = (context) => {
    context.fillStyle = 'green';
    context.fillRect(10, 10, 100, 100);
}

const _postdraw = (context) => {
    context.restore()
}

const Canvas = ({draw=_draw, predraw=_predraw, postdraw=_postdraw, context='2d', ...rest}) => {
    const canvasRef = useCanvas(draw, {predraw, postdraw})

    return <canvas ref={canvasRef} {...rest}></canvas>
}

export default Canvas;