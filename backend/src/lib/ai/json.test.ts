import assert from 'node:assert/strict'
import { extractJsonObjectFromText, validateAnnualPlan, validateWorkExtraction } from './json.js'

const cases: Array<{ name: string; input: string; check: (obj: any) => void }> = [
  {
    name: 'pure-json',
    input: '{"title":"T","date":"","content":"C"}',
    check: (obj) => {
      const r = validateWorkExtraction(obj)
      assert.equal(r.title, 'T')
    }
  },
  {
    name: 'fenced-json',
    input: `好的
\`\`\`json
{"title":"T","date":null,"content":"C"}
\`\`\``,
    check: (obj) => {
      const r = validateWorkExtraction(obj)
      assert.equal(r.date, '')
    }
  },
  {
    name: 'wrapped-json',
    input: '这里是结果： {"title":"T","date":"","content":"C"} 谢谢',
    check: (obj) => {
      const r = validateWorkExtraction(obj)
      assert.equal(r.content, 'C')
    }
  },
  {
    name: 'annual-plan',
    input: '{"plan":"a","budget":"b","prizes":"c","speech":"d"}',
    check: (obj) => {
      const r = validateAnnualPlan(obj)
      assert.equal(r.prizes, 'c')
    }
  }
]

for (const c of cases) {
  const obj = extractJsonObjectFromText(c.input)
  c.check(obj)
}

console.log('ai json tests: ok')
