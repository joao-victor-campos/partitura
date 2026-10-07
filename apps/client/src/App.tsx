import { useState } from 'react';
import type { ExerciseKind, RoundRecord } from '@partitura/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import { exitApp, useBackButton } from './hooks/useBackButton';
import { HomeScreen } from './training/HomeScreen';
import { ProgressScreen } from './training/ProgressScreen';
import { RoundScreen } from './training/RoundScreen';
import { SetupScreen, type RoundStart } from './training/SetupScreen';
import { SummaryScreen } from './training/SummaryScreen';

type Screen =
  | { name: 'home' }
  | { name: 'setup'; exercise: ExerciseKind }
  | { name: 'round'; start: RoundStart; run: number }
  | { name: 'summary'; start: RoundStart; record: RoundRecord }
  | { name: 'progress'; exercise: ExerciseKind };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const home = () => setScreen({ name: 'home' });
  const play = (start: RoundStart) => setScreen({ name: 'round', start, run: Date.now() });

  // Android back button: one step up, never straight out of the app mid-Round.
  useBackButton(() => {
    if (screen.name === 'home') exitApp();
    else if (screen.name === 'round') setScreen({ name: 'setup', exercise: screen.start.config.exercise });
    else home();
  });

  return (
    <ErrorBoundary key={screen.name} onReset={home}>
      <CurrentScreen screen={screen} setScreen={setScreen} home={home} play={play} />
    </ErrorBoundary>
  );
}

function CurrentScreen({ screen, setScreen, home, play }: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  home: () => void;
  play: (start: RoundStart) => void;
}) {
  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          onPick={(exercise) => setScreen({ name: 'setup', exercise })}
          onProgress={(exercise) => setScreen({ name: 'progress', exercise })}
        />
      );
    case 'setup':
      return <SetupScreen exercise={screen.exercise} onStart={play} onBack={home} />;
    case 'round':
      return (
        <RoundScreen
          key={screen.run}
          config={screen.start.config}
          levelId={screen.start.levelId}
          mode={screen.start.mode}
          onQuit={() => setScreen({ name: 'setup', exercise: screen.start.config.exercise })}
          onFinished={(record) => setScreen({ name: 'summary', start: screen.start, record })}
        />
      );
    case 'summary':
      return <SummaryScreen record={screen.record} onAgain={() => play(screen.start)} onBack={home} />;
    case 'progress':
      return <ProgressScreen exercise={screen.exercise} onBack={home} />;
  }
}
