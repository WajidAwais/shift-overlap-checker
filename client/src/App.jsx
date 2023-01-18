import "./App.css";
import { useState } from "react";
import TopBar from "./components/TopBar";
import ShiftSection from "./components/ShiftSection";
import Q4to6 from "./components/Q4to6";

function App() {
  const [section, setSection] = useState([]);

  return (
    <div className="App">
      <TopBar section={section} />
      <ShiftSection section={section} setSection={setSection} />
      <Q4to6 />
    </div>
  );
}

export default App;
