import { NextRequest, NextResponse } from 'next/server'
import { analyzeCode } from '../../../lib/ai'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const code = body.code
        if (!code)
            return NextResponse.json(
                { error: 'code is required' },
                { status: 400 }
            )

        const result = await analyzeCode(code)
        return NextResponse.json(result)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
