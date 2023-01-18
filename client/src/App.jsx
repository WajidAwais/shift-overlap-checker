import "./App.css";
import { useCallback, useState } from "react";
import { getShifts } from "./api";
import { useRequest } from "./useRequest";
import ShiftBoard from "./components/ShiftBoard";
import ComparePanel from "./components/ComparePanel";
import Reports from "./components/Reports";

function App() {
  const shifts = useRequest(getShifts, { immediate: true });
  const [selected, setSelected] = useState([]);

  const toggleShift = useCallback((id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(-2),
    );
  }, []);

  const byId = (id) => shifts.data?.find((s) => s.shift_id === id);

  return (
    <>
      <header className="masthead">
        <div className="masthead__inner">
          <p className="masthead__kicker">Staffing desk</p>
          <h1>Shift Overlap Checker</h1>
          <p className="masthead__lede">
            Pick two shifts to see how long they overlap. The same facility allows up to 30 minutes of
            handover; different facilities allow none.
          </p>
        </div>
      </header>
      <main className="layout">
        <ComparePanel
          key={selected.join("-")}
          first={byId(selected[0])}
          second={byId(selected[1])}
          onClear={() => setSelected([])}
        />
        <ShiftBoard shifts={shifts} selected={selected} onToggle={toggleShift} />
        <Reports />
      </main>
      <footer className="footer">Demo data only. Times are facility-local wall-clock times.</footer>
    </>
  );
}

export default App;
