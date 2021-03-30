import React from 'react';
import { useState } from 'react';

import { PaaskeRebus } from './PaaskeRebus';

type GoalCodeInputProps = {
  onSubmit: (code: string) => boolean
}

export const GoalCodeInput: React.FunctionComponent<GoalCodeInputProps> = (props) => {
  const [code, setCode] = useState<string>('')
  const [wrongText, setWrongText] = useState<string>('')
  const [lastCode, setLastCode] = useState<string>('')
  const handleSubmit = () => {
    const pb: PaaskeRebus = (window as any).pb
    if (code !== '' && !pb.tryCode(code)) {
      if (lastCode !== code) {
        setWrongText(pb.currentStep().wrongTexts[Math.floor(Math.random() * pb.currentStep().wrongTexts.length)])
        setLastCode(code)
      }
    }
  }
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value)
    setWrongText('')
  }
  return (
    <>
      <div className="codeinput">
        <input onChange={handleChange} />
        <button onClick={handleSubmit}>🐰</button>
      </div>
      <div className="wrong-text">{wrongText}</div>
    </>
  )
}
