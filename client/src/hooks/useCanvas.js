import { useRef, useEffect } from 'react';

const useCanvas = (draw, options={}) => {

    const canvasRef = useRef(null)

    useEffect(() => {

        const canvas = canvasRef.current
        const {predraw, postdraw} = options
        const context = canvas.getContext(options.context || '2d')
        let frameCount = 0
        let animationFrameId

        const render = () => {
            frameCount++
            predraw(context);
            draw(context, frameCount)
            postdraw(context)
            animationFrameId = window.requestAnimationFrame(render)
        }
        render()

        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [draw, options])

    return canvasRef
}

export default useCanvas