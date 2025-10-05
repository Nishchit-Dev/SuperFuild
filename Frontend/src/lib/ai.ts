import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function analyzeCode(code: string) {
    const prompt = `
You are a security auditor AI. Analyze the following JavaScript code:

${code}

Focus on:
- Business logic flaws
- API vulnerabilities
- Broken authentication
- Injection / input validation issues

Respond ONLY in JSON format:
{
  "vulnerabilities": [
    { "title": "", "description": "", "severity": "Low|Medium|High", "line": "" }
  ],
  "fixes": [
    { "line": "", "suggestion": "" }
  ]
}
  `

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        try {
            // Remove markdown code blocks if present
            let jsonText = text.trim()
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }
            
            return JSON.parse(jsonText)
        } catch (err: any) {
            return { parse_error: err.message, raw: text }
        }
    } catch (err: any) {
        return { error: err.message }
    }
}
