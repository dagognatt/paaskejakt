import React from 'react';
import { useState } from 'react';

type GoalCodeInputProps = {
  onSubmit: (code: string) => void
}

export const GoalCodeInput: React.FunctionComponent<GoalCodeInputProps> = (props) => {
  const [code, setCode] = useState<string>('')
  const handleSubmit = () => {
    const pb = (window as any).pb
    pb.tryCode(code)
  }
  return (
    <div className="codeinput">
      <input onChange={(event) => setCode(event.target.value)} />
      <button onClick={handleSubmit}>🐰</button>
    </div>
  )
}
