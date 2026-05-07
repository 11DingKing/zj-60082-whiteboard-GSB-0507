import React from 'react';
import Toolbar from './components/Toolbar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Canvas from './components/Canvas';
import StatusBar from './components/StatusBar';
import Modals from './components/Modals';

function App() {
  return (
    <div className="app-container">
      <Toolbar />
      
      <div className="main-content">
        <LeftPanel />
        
        <div className="canvas-container">
          <Canvas />
        </div>
        
        <RightPanel />
      </div>
      
      <StatusBar />
      <Modals />
    </div>
  );
}

export default App;
