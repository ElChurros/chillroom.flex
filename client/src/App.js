import React from 'react';
import { BrowserRouter, Route, Switch } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import Room from "./routes/Room";

import AudioCtx from './contexts/AudioCtx'

var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx = new AudioContext();

function App() {
  return (
    <AudioCtx.Provider value={ctx}>
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={CreateRoom}/>
          <Route path="/room/:roomID" component={Room}/>
        </Switch>
      </BrowserRouter>
    </AudioCtx.Provider>
  );
}

export default App;
