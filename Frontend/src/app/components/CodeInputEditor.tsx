'use client'
import { useState } from 'react'

interface CodeInputProps {
    code: string
    setCode: (value: string) => void
}

export default function CodeInput({ code, setCode }: CodeInputProps) {
    return (
        <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            className="w-full p-3 border rounded font-mono text-sm text-black/70"
        />
    )
}
