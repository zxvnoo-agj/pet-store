import { useMemo } from 'react'
import { View, Text, Image } from '@tarojs/components'
import MarkdownIt from 'markdown-it'
import Taro from '@tarojs/taro'

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const tokens = useMemo(() => {
    try {
      return md.parse(content, {})
    } catch {
      return []
    }
  }, [content])

  const renderTokens = (tokens: MarkdownIt.Token[], level = 0, compact = false): JSX.Element[] => {
    const result: JSX.Element[] = []
    let i = 0

    while (i < tokens.length) {
      const token = tokens[i]

      switch (token.type) {
        case 'paragraph_open':
          result.push(
            <View key={`${level}-${i}`} className={compact ? '' : 'my-2'}>
              {renderTokens(tokens.slice(i + 1, i + 1 + token.nesting), level + 1, compact)}
            </View>
          )
          i += 2
          break

        case 'heading_open':
          {
            const tag = token.tag
            const sizeClass = tag === 'h1' ? 'text-lg' : tag === 'h2' ? 'text-base' : 'text-sm'
            result.push(
              <View key={`${level}-${i}`} className="mt-3 mb-1">
                <Text className={`${sizeClass} font-bold text-gray-900`}>
                  {renderTokens(tokens.slice(i + 1, i + 1 + token.nesting), level + 1)}
                </Text>
              </View>
            )
            i += 2
          }
          break

        case 'bullet_list_open':
        case 'ordered_list_open':
          result.push(
            <View key={`${level}-${i}`} className="my-2 ml-2">
              {renderTokens(tokens.slice(i + 1, i + 1 + token.nesting), level + 1, compact)}
            </View>
          )
          i += 2
          break

        case 'list_item_open':
          // Find matching list_item_close to process all content tokens
          let endIdx = i + 1
          let itemDepth = 1
          while (endIdx < tokens.length && itemDepth > 0) {
            if (tokens[endIdx].type === 'list_item_open') itemDepth++
            else if (tokens[endIdx].type === 'list_item_close') itemDepth--
            endIdx++
          }
          // Find inline token within the list item content
          let inlineToken = null
          for (let k = i + 1; k < endIdx - 1; k++) {
            if (tokens[k].type === 'inline') {
              inlineToken = tokens[k]
              break
            }
          }
          result.push(
            <View key={`${level}-${i}`} className="flex items-start gap-1.5 mb-1">
              <View className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
              <View className="flex-1 min-w-0">
                {inlineToken
                  ? <Text className="text-sm text-gray-800 leading-relaxed">{renderInline(inlineToken.children || [])}</Text>
                  : renderTokens(tokens.slice(i + 1, endIdx - 1), level + 1, true)}
              </View>
            </View>
          )
          i = endIdx
          break

        case 'blockquote_open':
          result.push(
            <View key={`${level}-${i}`} className={compact ? 'pl-3 border-l-4 border-orange-300 bg-orange-50 py-2 px-3 rounded-r-lg' : 'my-2 pl-3 border-l-4 border-orange-300 bg-orange-50 py-2 px-3 rounded-r-lg'}>
              {renderTokens(tokens.slice(i + 1, i + 1 + token.nesting), level + 1, compact)}
            </View>
          )
          i += 2
          break

        case 'code_block':
          result.push(
            <View key={`${level}-${i}`} className="my-2 bg-gray-900 rounded-lg p-3 overflow-x-auto">
              {token.info && <Text className="text-[10px] text-gray-500 mb-1">{token.info}</Text>}
              <Text className="text-xs text-green-400 font-mono whitespace-pre">{token.content}</Text>
            </View>
          )
          i++
          break

        case 'fence':
          result.push(
            <View key={`${level}-${i}`} className="my-2 bg-gray-900 rounded-lg p-3 overflow-x-auto">
              {token.info && <Text className="text-[10px] text-gray-500 mb-1">{token.info}</Text>}
              <Text className="text-xs text-green-400 font-mono whitespace-pre">{token.content}</Text>
            </View>
          )
          i++
          break

        case 'fence':
          result.push(
            <View key={`${level}-${i}`} className="my-2 bg-gray-900 rounded-lg p-3 overflow-x-auto">
              {token.info && <Text className="text-[10px] text-gray-500 mb-1">{token.info}</Text>}
              <Text className="text-xs text-green-400 font-mono whitespace-pre">{token.content}</Text>
            </View>
          )
          i++
          break

        case 'table_open':
          {
            let j = i + 1
            let depth = 1
            while (j < tokens.length && depth > 0) {
              if (tokens[j].type === 'table_open') depth++
              else if (tokens[j].type === 'table_close') depth--
              j++
            }
            const tableTokens = tokens.slice(i, j)
            result.push(renderTable(tableTokens, `${level}-${i}`))
            i = j
          }
          break

        case 'hr':
          result.push(<View key={`${level}-${i}`} className="my-3 border-t border-gray-200" />)
          i++
          break

        case 'inline':
          result.push(
            <Text key={`${level}-${i}`} className="text-sm text-gray-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {renderInline(token.children || [])}
            </Text>
          )
          i++
          break

        case 'text':
          result.push(
            <Text key={`${level}-${i}`} className="text-sm text-gray-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{token.content}</Text>
          )
          i++
          break

        case 'paragraph_close':
        case 'heading_close':
        case 'bullet_list_close':
        case 'ordered_list_close':
        case 'list_item_close':
        case 'blockquote_close':
        case 'table_close':
          i++
          break

        default:
          i++
      }
    }

    return result
  }

  const renderTable = (tokens: MarkdownIt.Token[], keyPrefix: string): JSX.Element => {
    const rows: JSX.Element[] = []
    let currentRow: JSX.Element[] = []
    let isHeader = false
    let rowIdx = 0

    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const token = tokens[tIdx]
      if (token.type === 'thead_open') {
        isHeader = true
      } else if (token.type === 'thead_close') {
        isHeader = false
      } else if (token.type === 'tr_open') {
        currentRow = []
      } else if (token.type === 'tr_close') {
        rows.push(
          <View
            key={`${keyPrefix}-row-${rowIdx}`}
            className={`flex border-b ${isHeader ? 'border-gray-300 bg-gray-50' : 'border-gray-100'}`}
          >
            {currentRow}
          </View>
        )
        rowIdx++
      } else if (token.type === 'th_open' || token.type === 'td_open') {
        // Find the corresponding inline token and render its children for bold/italic support
        const inlineToken = tokens[tIdx + 1]

        currentRow.push(
          <View
            key={`${keyPrefix}-cell-${rowIdx}-${currentRow.length}`}
            className={`flex-1 p-2 ${isHeader ? 'py-2' : 'py-1.5'}`}
          >
            <Text
              className={`text-xs ${isHeader ? 'font-bold text-gray-900' : 'text-gray-700'}`}
            >
              {inlineToken?.type === 'inline'
                ? renderInline(inlineToken.children || [])
                : inlineToken?.content || ''}
            </Text>
          </View>
        )
      }
    }

    return (
      <View key={keyPrefix} className="my-3 border border-gray-200 rounded-lg overflow-hidden">
        {rows}
      </View>
    )
  }

  const renderInline = (tokens: MarkdownIt.Token[]): JSX.Element[] => {
    const result: JSX.Element[] = []
    let idx = 0
    while (idx < tokens.length) {
      const token = tokens[idx]
      switch (token.type) {
        case 'text':
          result.push(<Text key={idx} className="text-sm text-gray-800 leading-relaxed">{token.content}</Text>)
          idx++
          break

        case 'strong_open': {
          let j = idx + 1; let depth = 1
          while (j < tokens.length && depth > 0) {
            if (tokens[j].type === 'strong_open') depth++
            else if (tokens[j].type === 'strong_close') depth--
            j++
          }
          result.push(
            <Text key={`s-${idx}`} className="font-bold text-gray-900">
              {renderInline(tokens.slice(idx + 1, j - 1))}
            </Text>
          )
          idx = j; break
        }

        case 'strong_close':
          idx++; break

        case 'em_open': {
          let j = idx + 1; let depth = 1
          while (j < tokens.length && depth > 0) {
            if (tokens[j].type === 'em_open') depth++
            else if (tokens[j].type === 'em_close') depth--
            j++
          }
          result.push(
            <Text key={`em-${idx}`} className="italic text-gray-700">
              {renderInline(tokens.slice(idx + 1, j - 1))}
            </Text>
          )
          idx = j; break
        }

        case 'em_close':
          idx++; break

        case 'code_inline':
          result.push(
            <Text key={idx} className="text-xs bg-gray-100 text-orange-700 px-1 py-0.5 rounded font-mono">
              {token.content}
            </Text>
          )
          idx++; break

        case 'link_open': {
          let j = idx + 1; let depth = 1
          while (j < tokens.length && depth > 0) {
            if (tokens[j].type === 'link_open') depth++
            else if (tokens[j].type === 'link_close') depth--
            j++
          }
          const href = token.attrGet('href') || '#'
          result.push(
            <Text key={`l-${idx}`} className="text-blue-600 underline" onClick={() => { /* eslint-disable-next-line */ if (href.startsWith('/')) Taro.navigateTo({ url: href }) }}>
              {renderInline(tokens.slice(idx + 1, j - 1))}
            </Text>
          )
          idx = j; break
        }

        case 'link_close':
          idx++; break

        case 'softbreak':
          result.push(<Text key={idx}> </Text>)
          idx++; break

        case 'hardbreak':
          result.push(<Text key={idx}>{'\n'}</Text>)
          idx++; break

        case 's_open':
        case 's_close':
          idx++; break

        case 'image': {
          const src = token.attrGet('src') || ''
          result.push(
            <Image
              key={idx}
              src={src}
              className="w-full h-40 object-cover rounded-lg my-2"
              lazyLoad
            />
          )
          idx++; break
        }

        default:
          result.push(<Text key={idx}>{token.content || ''}</Text>)
          idx++; break
      }
    }
    return result
  }

  return <View>{renderTokens(tokens, 0, false)}</View>
}
