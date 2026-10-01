import React from 'react';
import { Composition, Folder } from 'remotion';
import { MainVideo, SCENES } from './compositions/MainVideo';
import { SCENE_FRAMES, TOTAL_FRAMES, VIDEO } from './styles/tokens';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BridgeAuxExplainer"
      component={MainVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Folder name="Scenes">
      {SCENES.map(({ id, component }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={SCENE_FRAMES}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ withMusic: true }}
        />
      ))}
    </Folder>
  </>
);
