interface Vulnerability {
    title: string
    description: string
    severity: 'Low' | 'Medium' | 'High'
    line: string
}

interface Fix {
    line: string
    suggestion: string
}

interface ResultCardProps {
    vulnerabilities: Vulnerability[]
    fixes: Fix[]
}

export default function ResultCard({
    vulnerabilities,
    fixes,
}: ResultCardProps) {
    return (
        <div className="mt-4 space-y-4 flex-row flex">
            <div>
                {vulnerabilities.map((v, i) => (
                    <div key={i} className="p-3 border rounded">
                        <div className="realtive flex justify-between">
                            <div>
                                <div className="font-semibold text-black/70" >{v.title}</div>
                                <div className="text-sm text-gray-600">
                                    {v.description}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Line: {v.line}
                                </div>
                            </div>
                            <div
                                className={`sticky right-0 top-0 px-2 py-1 font-medium text-sm ${
                                    v.severity === 'High'
                                        ? 'text-red-600'
                                        : v.severity === 'Medium'
                                        ? 'text-yellow-600'
                                        : 'text-green-600'
                                }`}
                            >
                                {v.severity}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div>
                {fixes.map((f, idx) => (
                    <div key={idx} className="p-3 border rounded bg-green-50">
                        <div className="text-sm font-medium text-black/70">
                            Suggested fix (Line {f.line}):
                        </div>
                        <div className="mt-1 text-sm text-black/70">
                            {f.suggestion}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
