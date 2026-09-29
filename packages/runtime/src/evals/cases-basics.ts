import { defineEvalCases } from '@anvia/core/evals'

export const basicCases = defineEvalCases([
  { id: 'addition', input: 'What is 2 + 2?', expected: '4' },
  { id: 'capital', input: 'What is the capital of France?', expected: 'paris' },
  { id: 'red-planet', input: 'Which planet is known as the Red Planet?', expected: 'mars' },
  {
    id: 'water-formula',
    input: 'Write the chemical formula for water using ASCII.',
    expected: 'h2o',
  },
  { id: 'http', input: 'What does HTTP stand for?', expected: 'hypertext transfer protocol' },
])
