import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'

interface MarkdownRendererProps {
  content: string
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; info: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' }

const textClass = 'text-sm text-gray-800 leading-relaxed'

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function parseMarkdown(content: string): Block[] {
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const info = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      blocks.push({ type: 'code', info, text: codeLines.join('\n') })
      i += 1
      continue
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/)
      blocks.push({
        type: 'heading',
        level: match?.[1].length || 3,
        text: match?.[2] || trimmed,
      })
      i += 1
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(splitTableRow(lines[i]))
        i += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') })
      continue
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const ordered = /^\d+[.)]\s+/.test(trimmed)
      const items: string[] = []
      while (i < lines.length) {
        const itemLine = lines[i].trim()
        const itemMatch = ordered
          ? itemLine.match(/^\d+[.)]\s+(.*)$/)
          : itemLine.match(/^[-*+]\s+(.*)$/)
        if (!itemMatch) break
        items.push(itemMatch[1])
        i += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    const paragraphLines = [trimmed]
    i += 1
    while (i < lines.length) {
      const next = lines[i].trim()
      if (
        !next ||
        next.startsWith('```') ||
        /^#{1,6}\s+/.test(next) ||
        /^[-*+]\s+/.test(next) ||
        /^\d+[.)]\s+/.test(next) ||
        next.startsWith('>') ||
        /^(-{3,}|\*{3,})$/.test(next) ||
        (next.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1]))
      ) {
        break
      }
      paragraphLines.push(next)
      i += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') })
  }

  return blocks
}

function renderInline(text: string, keyPrefix: string): JSX.Element[] {
  const parts: JSX.Element[] = []
  const pattern = /(!?\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|\n)/g
  let lastIndex = 0
  let index = 0
  let match: RegExpExecArray | null

  const pushText = (value: string) => {
    if (!value) return
    parts.push(
      <Text key={`${keyPrefix}-t-${index++}`} className={textClass} style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Text>,
    )
  }

  while ((match = pattern.exec(text)) !== null) {
    pushText(text.slice(lastIndex, match.index))
    const token = match[0]

    if (token === '\n') {
      parts.push(<Text key={`${keyPrefix}-br-${index++}`}>{'\n'}</Text>)
    } else if (match[1]?.startsWith('![')) {
      const src = match[3]
      parts.push(
        <Image
          key={`${keyPrefix}-img-${index++}`}
          src={src}
          className="w-full h-40 object-cover rounded-lg my-2"
          mode="aspectFill"
          lazyLoad
        />,
      )
    } else if (match[1]?.startsWith('[')) {
      const label = match[2]
      const href = match[3]
      parts.push(
        <Text
          key={`${keyPrefix}-link-${index++}`}
          className="text-sm text-blue-600 underline leading-relaxed"
          onClick={() => {
            if (href.startsWith('/')) Taro.navigateTo({ url: href })
          }}
        >
          {label}
        </Text>,
      )
    } else if (match[4]) {
      parts.push(
        <Text key={`${keyPrefix}-code-${index++}`} className="text-xs bg-gray-100 text-orange-700 px-1 py-0.5 rounded font-mono">
          {match[4]}
        </Text>,
      )
    } else if (match[5] || match[6]) {
      parts.push(
        <Text key={`${keyPrefix}-strong-${index++}`} className="text-sm font-bold text-gray-900 leading-relaxed">
          {match[5] || match[6]}
        </Text>,
      )
    } else if (match[7] || match[8]) {
      parts.push(
        <Text key={`${keyPrefix}-em-${index++}`} className="text-sm italic text-gray-700 leading-relaxed">
          {match[7] || match[8]}
        </Text>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  pushText(text.slice(lastIndex))
  return parts
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = parseMarkdown(content)

  const renderTable = (block: Extract<Block, { type: 'table' }>, key: string) => {
    const rows = [block.headers, ...block.rows]
    return (
      <ScrollView key={key} className="my-3 w-full" scrollX enhanced showScrollbar={false}>
        <View className="border border-gray-200 rounded-lg overflow-hidden" style={{ minWidth: '520px' }}>
          {rows.map((row, rowIdx) => (
            <View
              key={`${key}-row-${rowIdx}`}
              className={`flex flex-row border-b ${rowIdx === 0 ? 'border-gray-200 bg-gray-50' : 'border-gray-100'}`}
            >
              {row.map((cell, cellIdx) => (
                <View
                  key={`${key}-cell-${rowIdx}-${cellIdx}`}
                  className="flex-1 p-2 min-w-0 border-r border-gray-100"
                >
                  <Text className={`text-xs leading-relaxed ${rowIdx === 0 ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                    {renderInline(cell, `${key}-cell-${rowIdx}-${cellIdx}`)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    )
  }

  return (
    <View className="markdown-content">
      {blocks.map((block, index) => {
        const key = `md-${index}`
        switch (block.type) {
          case 'heading': {
            const sizeClass = block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-sm'
            return (
              <View key={key} className="mt-3 mb-1.5">
                <Text className={`${sizeClass} font-bold text-gray-900 leading-snug`}>
                  {renderInline(block.text, key)}
                </Text>
              </View>
            )
          }

          case 'paragraph':
            return (
              <View key={key} className="mb-2">
                {renderInline(block.text, key)}
              </View>
            )

          case 'list':
            return (
              <View key={key} className="my-2">
                {block.items.map((item, itemIndex) => (
                  <View key={`${key}-item-${itemIndex}`} className="flex flex-row items-start mb-1.5">
                    {block.ordered ? (
                      <Text className="text-sm text-orange-500 font-semibold leading-relaxed mr-1.5" style={{ minWidth: '24px' }}>
                        {itemIndex + 1}.
                      </Text>
                    ) : (
                      <View className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-2 mr-2" />
                    )}
                    <View className="flex-1 min-w-0">
                      {renderInline(item, `${key}-item-${itemIndex}`)}
                    </View>
                  </View>
                ))}
              </View>
            )

          case 'blockquote':
            return (
              <View key={key} className="my-2 pl-3 border-l-4 border-orange-300 bg-orange-50 py-2 px-3 rounded-r-lg">
                {renderInline(block.text, key)}
              </View>
            )

          case 'code':
            return (
              <View key={key} className="my-2 bg-gray-900 rounded-lg p-3 overflow-hidden">
                {block.info ? <Text className="text-[10px] text-gray-400 mb-1">{block.info}</Text> : null}
                <Text
                  className="text-xs text-green-300 font-mono leading-relaxed"
                  selectable
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {block.text.replace(/\n$/, '')}
                </Text>
              </View>
            )

          case 'table':
            return renderTable(block, key)

          case 'hr':
            return <View key={key} className="my-3 border-t border-gray-200" />
        }
      })}
    </View>
  )
}
