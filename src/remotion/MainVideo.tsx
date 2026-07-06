import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence } from "remotion";

export const MainVideo: React.FC<{
  images: string[];
  audioUrl?: string;
  audioStart: number;
  audioEnd: number;
  script: any;
}> = ({ images, audioUrl, audioStart, audioEnd, script }) => {
  const { fps } = useVideoConfig();
  
  // Parse script from AI or fallback to basic image slideshow
  const scenes = script?.cenas || images.map((img, i) => {
    return {
      inicio: i * 4,
      fim: (i + 1) * 4,
      imagem: i + 1,
      efeito: "zoom_in",
      texto: "Confira!"
    }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {audioUrl && (
        <Audio 
          src={`http://localhost:3000${audioUrl}`} 
          startFrom={audioStart * fps}
          endAt={audioEnd * fps}
        />
      )}

      {scenes.map((scene: any, i: number) => {
        const startFrame = scene.inicio * fps;
        const durationFrames = (scene.fim - scene.inicio) * fps;
        const imgUrl = images[(scene.imagem - 1)] || images[0];
        
        if (!imgUrl) return null;

        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            <Scene 
              imgUrl={`http://localhost:3000${imgUrl}`} 
              text={scene.texto} 
              effect={scene.efeito}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ imgUrl: string; text: string; effect: string }> = ({ imgUrl, text, effect }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Basic effects
  const zoom = interpolate(frame, [0, fps * 4], [1, 1.2], { extrapolateRight: 'clamp' });
  const panLeft = interpolate(frame, [0, fps * 4], [0, -100], { extrapolateRight: 'clamp' });
  const panRight = interpolate(frame, [0, fps * 4], [0, 100], { extrapolateRight: 'clamp' });
  const zoomOut = interpolate(frame, [0, fps * 4], [1.2, 1], { extrapolateRight: 'clamp' });

  let scale = 1;
  let translateX = 0;

  if (effect === 'zoom_in' || effect === 'cinematic_zoom') scale = zoom;
  if (effect === 'zoom_out') scale = zoomOut;
  if (effect === 'pan_left') translateX = panLeft;
  if (effect === 'pan_right' || effect === 'pan_right') translateX = panRight;

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const textY = spring({ frame, fps, config: { damping: 100 } }) * -50 + 50;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translateX(${translateX}px)` }}>
        <Img src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      
      <AbsoluteFill style={{ opacity, justifyContent: "center", alignItems: "center" }}>
        <div style={{
          transform: `translateY(${textY}px)`,
          color: "white", 
          fontSize: "80px", 
          fontWeight: "bold",
          textAlign: "center",
          textShadow: "0px 4px 20px rgba(0,0,0,0.8)",
          fontFamily: "Inter, sans-serif",
          maxWidth: "80%",
          lineHeight: 1.2
        }}>
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
