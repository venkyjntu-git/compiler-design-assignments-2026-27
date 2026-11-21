import React, { useState } from 'react';
import { CompilerProvider } from './hooks/useCompilerContext';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { PipelineExplorerPage } from './pages/PipelineExplorerPage';
import { LL1VisualizerPage } from './pages/LL1VisualizerPage';
import { LR1VisualizerPage } from './pages/LR1VisualizerPage';
import { AnimatedLessonsPage } from './pages/AnimatedLessonsPage';
import { QuizPage } from './pages/QuizPage';
import { ProgressPage } from './pages/ProgressPage';
import { AboutPage } from './pages/AboutPage';
import { ExecutionGuideModal } from './components/ExecutionGuideModal';
import { StoryModeModal } from './components/StoryModeModal';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(p) => setActivePage(p)}
            onOpenGuide={() => setIsGuideOpen(true)}
            onOpenStory={() => setIsStoryOpen(true)}
          />
        );
      case 'playground':
        return <PlaygroundPage />;
      case 'explorer':
        return <PipelineExplorerPage />;
      case 'll1':
        return <LL1VisualizerPage />;
      case 'lr1':
        return <LR1VisualizerPage />;
      case 'lessons':
        return <AnimatedLessonsPage />;
      case 'quiz':
        return <QuizPage />;
      case 'progress':
        return <ProgressPage />;
      case 'about':
        return <AboutPage />;
      default:
        return (
          <DashboardPage
            onNavigate={(p) => setActivePage(p)}
            onOpenGuide={() => setIsGuideOpen(true)}
            onOpenStory={() => setIsStoryOpen(true)}
          />
        );
    }
  };

  return (
    <CompilerProvider>
      <div className="min-h-screen bg-background flex flex-col selection:bg-primary-500 selection:text-white">
        {/* Top Navbar */}
        <Navbar
          currentPage={activePage}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenStory={() => setIsStoryOpen(true)}
        />

        {/* Content Body with Left Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar activePage={activePage} onSelectPage={(p) => setActivePage(p)} />

          <main className="flex-1 overflow-y-auto">
            {renderPage()}
          </main>
        </div>

        {/* Execution Guide Modal */}
        <ExecutionGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

        {/* Story Mode Modal */}
        <StoryModeModal isOpen={isStoryOpen} onClose={() => setIsStoryOpen(false)} />
      </div>
    </CompilerProvider>
  );
};

export default App;
