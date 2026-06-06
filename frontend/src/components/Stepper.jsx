export default function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={label} className={`stepper-item${done ? ' done' : ''}${active ? ' active' : ''}`}>
            <div className="stepper-circle">{done ? '✓' : step}</div>
            <span className="stepper-label">{label}</span>
            {i < steps.length - 1 && <div className="stepper-line" />}
          </div>
        )
      })}
    </div>
  )
}
