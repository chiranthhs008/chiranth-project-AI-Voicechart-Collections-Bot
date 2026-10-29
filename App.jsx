import { useState } from "react";

export default function App() {

  const [calls, setCalls] = useState([
    { name: "John", status: "Promise to Pay" },
    { name: "Alice", status: "Call Back Later" },
    { name: "David", status: "Paid" }
  ]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Voice Collections Dashboard</h1>

      {calls.map((call, i) => (
        <div key={i} style={{ margin: 10, padding: 10, border: "1px solid #ccc" }}>
          <h3>{call.name}</h3>
          <p>Status: {call.status}</p>
        </div>
      ))}
    </div>
  );
}