import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainVideo}
        durationInFrames={30 * 30} // default 30s, overriden during render
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          images: [],
          audioUrl: "",
          audioStart: 0,
          audioEnd: 30,
          script: null
        }}
      />
    </>
  );
};
