'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiService } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, ShieldAlert, XCircle, Code, FileText, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type ScanJob = {
    id: number
    status: 'pending' | 'running' | 'completed' | 'failed'
    scanType: string
    targetBranch: string
    startedAt: string
    completedAt?: string | null
    errorMessage?: string | null
    repository: { name: string; fullName: string }
}

type Vulnerability = {
    title: string
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    category: string
    lineNumber?: number | null
    startingLine?: number | null
    endingLine?: number | null
    codeSnippet?: string
    cweId?: string | null
    owaspCategory?: string | null
}

type HighlightRange = { start: number; end: number }

type FixSuggestion = {
    line: string
    suggestion: string
}

type ScanResult = {
    id?: number
    file_path: string
    file_content_hash?: string | null
    vulnerabilities?: Vulnerability[]
    fixes?: FixSuggestion[]
    // flattened single row (fallback)
    title?: string
    description?: string
    severity?: Vulnerability['severity']
    category?: string
    line_number?: number | null
    starting_line?: number | null
    ending_line?: number | null
    code_snippet?: string
    cwe_id?: string | null
    owasp_category?: string | null
}

type ScanResponse = {
    scanJob: ScanJob
    results: ScanResult[]
}

export default function ScanJobPage() {
    const params = useParams<{ scanJobId: string }>()
    const router = useRouter()
    const scanJobId = useMemo(() => params?.scanJobId, [params])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ScanResponse | null>(null)

    useEffect(() => {
        if (!scanJobId) return
        let cancelled = false

        const poll = async () => {
            try {
                const resp = await apiService.get<ScanResponse>(
                    `/api/github/scan/${scanJobId}`
                )
                if (cancelled) return
                setData(resp)
                setError(null)
                setLoading(false)

                if (resp.scanJob.status === 'pending' || resp.scanJob.status === 'running') {
                    setTimeout(poll, 2000)
                }
            } catch (err: any) {
                if (cancelled) return
                setError(err.message || 'Failed to fetch scan status')
                setLoading(false)
                setTimeout(poll, 3000)
            }
        }

        setLoading(true)
        poll()
        return () => {
            cancelled = true
        }
    }, [scanJobId])

    const renderStatusIcon = (status: ScanJob['status']) => {
        if (status === 'running' || status === 'pending') {
            return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        }
        if (status === 'completed') {
            return <CheckCircle className="h-5 w-5 text-green-600" />
        }
        return <XCircle className="h-5 w-5 text-red-600" />
    }

    const grouped = useMemo(() => {
        if (!data?.results) return [] as Array<{ file: string; vulns: Vulnerability[]; fixes: FixSuggestion[] }>
        const map = new Map<string, { vulns: Vulnerability[]; fixes: FixSuggestion[] }>()
        for (const r of data.results) {
            const file = r.file_path
            let vulns: Vulnerability[] = []
            if (Array.isArray(r.vulnerabilities) && r.vulnerabilities.length) {
                vulns = r.vulnerabilities.map(v => ({
                    title: v.title,
                    description: v.description,
                    severity: v.severity as Vulnerability['severity'],
                    category: v.category,
                    lineNumber: v.lineNumber ?? null,
                    startingLine: v.startingLine ?? null,
                    endingLine: v.endingLine ?? null,
                    codeSnippet: v.codeSnippet,
                    cweId: v.cweId ?? null,
                    owaspCategory: v.owaspCategory ?? null,
                }))
            } else if (r.title && r.severity) {
                vulns = [{
                    title: r.title,
                    description: r.description || '',
                    severity: r.severity,
                    category: r.category || 'general',
                    lineNumber: r.line_number ?? null,
                    startingLine: r.starting_line ?? null,
                    endingLine: r.ending_line ?? null,
                    codeSnippet: r.code_snippet,
                    cweId: r.cwe_id ?? null,
                    owaspCategory: r.owasp_category ?? null,
                }]
            }
            const fixes: FixSuggestion[] = Array.isArray(r.fixes) ? r.fixes.map(f => ({ line: String(f.line), suggestion: String(f.suggestion) })) : []
            if (!map.has(file)) map.set(file, { vulns: [], fixes: [] })
            const entry = map.get(file)!
            entry.vulns.push(...vulns)
            entry.fixes.push(...fixes)
        }
        return Array.from(map.entries()).map(([file, { vulns, fixes }]) => ({ file, vulns, fixes }))
    }, [data])

    const severityClass = (s: Vulnerability['severity']) => {
        switch (s) {
            case 'critical':
                return 'bg-red-600 text-white'
            case 'high':
                return 'bg-orange-500 text-white'
            case 'medium':
                return 'bg-yellow-400 text-black'
            case 'low':
                return 'bg-blue-200 text-blue-900'
            default:
                return 'bg-gray-200 text-gray-800'
        }
    }

    const severityIcon = (s: Vulnerability['severity']) => {
        switch (s) {
            case 'critical':
                return <XCircle className="h-4 w-4 text-red-600" />
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />
            case 'medium':
                return <ShieldAlert className="h-4 w-4 text-yellow-500" />
            case 'low':
                return <AlertTriangle className="h-4 w-4 text-blue-500" />
            default:
                return <ShieldAlert className="h-4 w-4 text-gray-500" />
        }
    }

    // Removed hook-usage from non-component helper; we now use components below

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {renderStatusIcon(data?.scanJob.status || 'pending')}
                                    Scan {scanJobId}
                                </CardTitle>
                                <CardDescription>
                                    {data?.scanJob.repository
                                        ? `${data.scanJob.repository.fullName} • ${data.scanJob.status}`
                                        : 'Checking scan status...'}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/github">
                                    <Button variant="outline">Back to GitHub</Button>
                                </Link>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading && (
                            <div className="flex items-center gap-3 text-gray-600">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Scanning in progress...</span>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {data?.scanJob && (
                            <div className="mb-6 p-4 bg-white rounded-lg border">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Repository:</span>
                                        <div className="font-medium text-gray-900">{data.scanJob.repository.fullName}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Status:</span>
                                        <div className="flex items-center gap-2">
                                            {data.scanJob.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                            {data.scanJob.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                                            {data.scanJob.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                                            <span className="font-medium capitalize">{data.scanJob.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Scan Type:</span>
                                        <div className="font-medium">{data.scanJob.scanType} • {data.scanJob.targetBranch}</div>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    <div>Started: {new Date(data.scanJob.startedAt).toLocaleString()}</div>
                                    {data.scanJob.completedAt && (
                                        <div>Completed: {new Date(data.scanJob.completedAt).toLocaleString()}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {data?.scanJob.status === 'completed' && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Vulnerability Analysis
                                </h3>
                                {grouped.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <div className="text-lg font-medium">No vulnerabilities found</div>
                                        <div className="text-sm">Your code appears to be secure!</div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {grouped.map(({ file, vulns, fixes }) => (
                                            <Card key={file} className="overflow-hidden">
                                                <CardHeader className="bg-gray-50 border-b">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-5 w-5 text-gray-600" />
                                                            <CardTitle className="text-lg">{file}</CardTitle>
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {vulns.length} finding{vulns.length !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <div className="space-y-6 p-6">
                                                        {vulns.map((v, i) => {
                                                            // Match fixes by overlapping line ranges with vulnerability lineNumber
                                                            const parseRange = (rangeStr: string) => {
                                                                const parts = String(rangeStr).split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n))
                                                                if (parts.length === 0) return { start: NaN, end: NaN }
                                                                if (parts.length === 1) return { start: parts[0], end: parts[0] }
                                                                return { start: Math.min(parts[0], parts[1]), end: Math.max(parts[0], parts[1]) }
                                                            }
                                                            const matchedFixesRaw = (fixes || []).filter(f => {
                                                                if (!v.lineNumber) return false
                                                                const { start, end } = parseRange(f.line)
                                                                if (isNaN(start) || isNaN(end)) return false
                                                                return v.lineNumber! >= start && v.lineNumber! <= end
                                                            })
                                                            // Deduplicate identical suggestions (some rows can repeat per vulnerability)
                                                            const seen = new Set<string>()
                                                            const matchedFixes = matchedFixesRaw.filter(f => {
                                                                const key = `${f.line}|${f.suggestion}`
                                                                if (seen.has(key)) return false
                                                                seen.add(key)
                                                                return true
                                                            })
                                                            return (
                                                                <VulnerabilityItem
                                                                    key={i}
                                                                    file={file}
                                                                    scanJobId={String(data.scanJob.id)}
                                                                    vulnerability={v}
                                                                    fixes={matchedFixes}
                                                                    severityBadgeClass={severityClass(v.severity)}
                                                                />
                                                            )
                                                        })}

                                                        
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {data?.scanJob.status === 'failed' && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {data.scanJob.errorMessage || 'Scan failed.'}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


function CodeFetcher({ scanJobId, filePath, lineNumber }: { scanJobId: string; filePath: string; lineNumber?: number }) {
    const [snippet, setSnippet] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const fetchCode = async () => {
            try {
                const resp = await apiService.get<{ content: string }>(`/api/github/scan/${scanJobId}/file?path=${encodeURIComponent(filePath)}`)
                if (cancelled) return
                setSnippet(resp.content)
            } catch (err: any) {
                if (cancelled) return
                setError(err?.message || 'Failed to load code')
            }
        }
        fetchCode()
        return () => { cancelled = true }
    }, [scanJobId, filePath])

    if (error) {
        return (
            <div className="mt-3 text-xs text-red-600">{error}</div>
        )
    }

    if (!snippet) {
        return (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading code…</span>
            </div>
        )
    }

    // Compute window around target line
    const allLines = snippet.split('\n')
    const target = lineNumber || null
    
    // Calculate window around target line
    let start = 1
    let end = allLines.length
    let lines = allLines
    
    if (target) {
        start = Math.max(1, target - 8)
        end = Math.min(allLines.length, target + 8)
        lines = allLines.slice(start - 1, end)
    } else if (allLines.length > 16) {
        // If no target line, show first 16 lines
        lines = allLines.slice(0, 16)
        end = 16
    }

    return (
        <div className="mt-3 border rounded-lg overflow-hidden">
            <div className="text-gray-800 bg-gray-200 px-4 py-2 text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code Snippet
                {target && (
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">Line {target}</span>
                )}
            </div>
            <div className="text-gray-800 bg-gray-200 font-mono text-sm overflow-x-auto">
                {lines.map((line, index) => {
                    const lineNum = start + index
                    const isHighlighted = !!(target && lineNum === target)
                    return (
                        <div key={index} className={`flex ${isHighlighted ? 'bg-red-900/30 border-l-4 border-red-500' : 'hover:bg-gray-200/50'}`}>
                            <div className="w-12 px-3 py-1 text-xs bg-gray-600 text-gray-200 border-r border-gray-700 select-none">{lineNum}</div>
                            <div className="flex-1 px-3 py-1 whitespace-pre-wrap">{line}</div>
                            {isHighlighted && (<div className="w-2 bg-red-500/40"></div>)}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


function FixItem({ lineRange, suggestion, onHighlight }: { lineRange: string; suggestion: string; onHighlight?: (start: number, end: number) => void }) {
    const parseRange = (rangeStr: string) => {
        const parts = String(rangeStr).split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n))
        if (parts.length === 0) return { start: NaN, end: NaN }
        if (parts.length === 1) return { start: parts[0], end: parts[0] }
        return { start: Math.min(parts[0], parts[1]), end: Math.max(parts[0], parts[1]) }
    }

    const { start, end } = parseRange(lineRange)
    const label = isNaN(start) ? 'Line' : `Line ${start}${end !== start ? `-${end}` : ''}`

    return (
        <div className="flex items-start gap-3">
            <button
                type="button"
                className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-800 whitespace-nowrap hover:bg-gray-300"
                onClick={() => {
                    if (!isNaN(start) && !isNaN(end) && onHighlight) onHighlight(start, end)
                }}
            >
                {label}
            </button>
            <p className="text-sm text-gray-700 leading-relaxed">{suggestion}</p>
        </div>
    )
}

function VulnerabilityItem({ file, scanJobId, vulnerability, fixes, severityBadgeClass }: {
    file: string
    scanJobId: string
    vulnerability: Vulnerability
    fixes: FixSuggestion[]
    severityBadgeClass: string
}) {
    const [highlight, setHighlight] = useState<HighlightRange | null>(null)
    
    const iconForSeverity = (s: Vulnerability['severity']) => {
        switch (s) {
            case 'critical':
                return <XCircle className="h-4 w-4 text-red-600" />
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />
            case 'medium':
                return <ShieldAlert className="h-4 w-4 text-yellow-500" />
            case 'low':
                return <AlertTriangle className="h-4 w-4 text-blue-500" />
            default:
                return <ShieldAlert className="h-4 w-4 text-gray-500" />
        }
    }

    const getDefaultRange = (vuln: Vulnerability, fixList: FixSuggestion[]): HighlightRange | null => {
        // First try to get range from vulnerability's startingLine/endingLine (from AI)
        if (vuln.startingLine && vuln.endingLine) {
            return { start: vuln.startingLine, end: vuln.endingLine }
        }
        // Then try to get range from fixes (multi-line)
        if (fixList && fixList.length > 0) {
            const firstFix = fixList[0]
            const { start, end } = parseRange(firstFix.line)
            if (!isNaN(start) && !isNaN(end)) {
                return { start, end }
            }
        }
        // Fallback to single line from vulnerability
        if (vuln.lineNumber) {
            return { start: vuln.lineNumber, end: vuln.lineNumber }
        }
        return null
    }

    const parseRange = (rangeStr: string) => {
        const parts = String(rangeStr).split('-').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n))
        if (parts.length === 0) return { start: NaN, end: NaN }
        if (parts.length === 1) return { start: parts[0], end: parts[0] }
        return { start: Math.min(parts[0], parts[1]), end: Math.max(parts[0], parts[1]) }
    }

    return (
        <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1">
                    {iconForSeverity(vulnerability.severity)}
                    <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                            {vulnerability.title}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {vulnerability.category}
                            </span>
                            {vulnerability.cweId && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {vulnerability.cweId}
                                </span>
                            )}
                            {vulnerability.owaspCategory && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                    {vulnerability.owaspCategory}
                                </span>
                            )}
                            {(vulnerability.startingLine && vulnerability.endingLine) ? (
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                    Line {vulnerability.startingLine}-{vulnerability.endingLine}
                                </span>
                            ) : vulnerability.lineNumber && (
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                    Line {vulnerability.lineNumber}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${severityBadgeClass}`}>
                    {vulnerability.severity.toUpperCase()}
                </span>
            </div>

            {vulnerability.description && (
                <div className="mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                        {vulnerability.description}
                    </p>
                </div>
            )}

            {/* Render code snippet with chosen highlight range */}
            {vulnerability.codeSnippet ? (
                <CodeSnippet code={vulnerability.codeSnippet} range={highlight || getDefaultRange(vulnerability, fixes)} />
            ) : (
                <CodeFetcherWithRange
                    scanJobId={scanJobId}
                    filePath={file}
                    range={highlight || getDefaultRange(vulnerability, fixes)}
                />
            )}

            {fixes && fixes.length > 0 && (
                <div className="ml-0 m-4 border-t p-3 bg-green-400/20 rounded-xl">
                    <div className="font-medium  text-gray-900 mb-2">Fixes</div>
                    <div className="space-y-2">
                        {fixes.map((f, idx2) => {
                            const { start, end } = parseRange(f.line)
                            return (
                                <div key={idx2} className="flex items-start gap-3">
                                    <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-800 whitespace-nowrap hover:bg-gray-300"
                                        onClick={() => { if (!isNaN(start) && !isNaN(end)) setHighlight({ start, end }) }}
                                    >
                                        Line {isNaN(start) ? '' : start}{!isNaN(end) && end !== start ? `-${end}` : ''}
                                    </button>
                                    <p className="text-sm text-gray-700 leading-relaxed">{f.suggestion}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function CodeSnippet({ code, range }: { code: string; range: HighlightRange | null }) {
    const allLines = (code || '').split('\n')
    const rangeStart = range?.start || null
    const rangeEnd = range?.end || null

    // Calculate window around range
    let startLine = 1
    let endLine = allLines.length
    let lines = allLines

    if (rangeStart && rangeEnd) {
        startLine = Math.max(1, rangeStart - 8)
        endLine = Math.min(allLines.length, rangeEnd + 8)
        lines = allLines.slice(startLine - 1, endLine)
    } else if (allLines.length > 16) {
        lines = allLines.slice(0, 16)
        endLine = 16
    }

    return (
        <div className="mt-3 border rounded-lg overflow-hidden">
            <div className="text-gray-800 bg-gray-200 px-4 py-2 text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code Snippet
                {(rangeStart && rangeEnd) && (
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                        Line {rangeStart}{rangeEnd !== rangeStart ? `-${rangeEnd}` : ''}
                    </span>
                )}
            </div>
            <div className="text-gray-800 bg-gray-200 font-mono text-sm overflow-x-auto">
                {lines.map((line, index) => {
                    const lineNum = startLine + index
                    const isHighlighted = !!(rangeStart && rangeEnd && lineNum >= rangeStart && lineNum <= rangeEnd)
                    return (
                        <div key={index} className={`flex ${isHighlighted ? 'bg-red-900/30 border-l-4 border-red-500' : 'hover:bg-gray-200/50'}`}>
                            <div className="w-12 px-3 py-1 text-xs bg-gray-600 text-gray-200 border-r border-gray-700 select-none">{lineNum}</div>
                            <div className="flex-1 px-3 py-1 whitespace-pre-wrap">{line}</div>
                            {isHighlighted && (<div className="w-2 bg-red-500/40"></div>)}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function CodeFetcherWithRange({ scanJobId, filePath, range }: { scanJobId: string; filePath: string; range: HighlightRange | null }) {
    const [snippet, setSnippet] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const fetchCode = async () => {
            try {
                const resp = await apiService.get<{ content: string }>(`/api/github/scan/${scanJobId}/file?path=${encodeURIComponent(filePath)}`)
                if (cancelled) return
                setSnippet(resp.content)
            } catch (err: any) {
                if (cancelled) return
                setError(err?.message || 'Failed to load code')
            }
        }
        fetchCode()
        return () => { cancelled = true }
    }, [scanJobId, filePath])

    if (error) {
        return <div className="mt-3 text-xs text-red-600">{error}</div>
    }
    if (!snippet) {
        return (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading code…</span>
            </div>
        )
    }
    return <CodeSnippet code={snippet} range={range} />
}


