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
      return md.parse(content || '', {})
    } catch {
      return []
    }
  }, [content])

  const findClosingToken = (
    source: MarkdownIt.Token[],
    start: number,
    openType: string,
    closeType: string,
  ) => {
    let depth = 1
    for (let index = start + 1; index < source.length; index++) {
      if (source[index].type === openType) depth += 1
      if (source[index].type === closeType) depth -= 1
      if (depth === 0) return index
    }
    return start
  }

  const textClass = 'text-sm text-gray-800 leading-relaxed'

  const renderTokens = (
    source: MarkdownIt.Token[],
    level = 0,
    compact = false,
  ): JSX.Element[] => {
    const result: JSX.Element[] = []
    let i = 0

    while (i < source.length) {
      const token = source[i]

      switch (token.type) {
        case 'paragraph_open': {
          const end = findClosingToken(source, i, 'paragraph_open', 'paragraph_close')
          const inner = source.slice(i + 1, end)
          result.push(
            <View key={`${level}-${i}`} className={compact ? 'mb-1' : 'mb-2'}>
              {renderTokens(inner, level + 1, compact)}
            </View>,
          )
          i = end + 1
          break
        }

        case 'heading_open': {
          const end = findClosingToken(source, i, 'heading_open', 'heading_close')
          const inlineToken = source.slice(i + 1, end).find((item) => item.type === 'inline')
          const tag = token.tag
          const sizeClass = tag === 'h1' ? 'text-lg' : tag === 'h2' ? 'text-base' : 'text-sm'
          result.push(
            <View key={`${level}-${i}`} className={compact ? 'mb-1' : 'mt-3 mb-1.5'}>
              <Text className={`${sizeClass} font-bold text-gray-900 leading-snug`}>
                {inlineToken ? renderInline(inlineToken.children || []) : ''}
              </Text>
            </View>,
          )
          i = end + 1
          break
        }

        case 'bullet_list_open':
        case 'ordered_list_open': {
          const closeType = token.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close'
          const end = findClosingToken(source, i, token.type, closeType)
          result.push(renderList(source.slice(i + 1, end), token.type === 'ordered_list_open', `${level}-${i}`, compact, token))
          i = end + 1
          break
        }

        case 'list_item_open': {
          const end = findClosingToken(source, i, 'list_item_open', 'list_item_close')
          result.push(renderListItem(source.slice(i + 1, end), `${level}-${i}`, undefined, compact))
          i = end + 1
          break
        }

        case 'blockquote_open': {
          const end = findClosingToken(source, i, 'blockquote_open', 'blockquote_close')
          result.push(
            <View
              key={`${level}-${i}`}
              className={`${compact ? 'mb-1' : 'my-2'} pl-3 border-l-4 border-orange-300 bg-orange-50 py-2 px-3 rounded-r-lg`}
            >
              {renderTokens(source.slice(i + 1, end), level + 1, true)}
            </View>,
          )
          i = end + 1
          break
        }

        case 'code_block':
        case 'fence':
          result.push(renderCodeBlock(token, `${level}-${i}`))
          i += 1
          break

        case 'table_open': {
          const end = findClosingToken(source, i, 'table_open', 'table_close')
          result.push(renderTable(source.slice(i, end + 1), `${level}-${i}`))
          i = end + 1
          break
        }

        case 'hr':
          result.push(<View key={`${level}-${i}`} className="my-3 border-t border-gray-200" />)
          i += 1
          break

        case 'inline':
          result.push(
            <View key={`${level}-${i}`} className={textClass}>
              {renderInline(token.children || [])}
            </View>,
          )
          i += 1
          break

        case 'text':
          result.push(
            <Text key={`${level}-${i}`} className={textClass} style={{ whiteSpace: 'pre-wrap' }}>
              {token.content}
            </Text>,
          )
          i += 1
          break

        default:
          i += 1
      }
    }

    return result
  }

  const renderList = (
    listTokens: MarkdownIt.Token[],
    ordered: boolean,
    keyPrefix: string,
    compact: boolean,
    listToken: MarkdownIt.Token,
  ) => {
    const items: JSX.Element[] = []
    let itemIndex = 0
    let cursor = 0
    const start = Number(listToken.attrGet('start') || 1)

    while (cursor < listTokens.length) {
      const token = listTokens[cursor]
      if (token.type !== 'list_item_open') {
        cursor += 1
        continue
      }

      const end = findClosingToken(listTokens, cursor, 'list_item_open', 'list_item_close')
      const marker = ordered ? `${start + itemIndex}.` : undefined
      items.push(renderListItem(listTokens.slice(cursor + 1, end), `${keyPrefix}-item-${itemIndex}`, marker, true))
      itemIndex += 1
      cursor = end + 1
    }

    return (
      <View key={keyPrefix} className={compact ? 'mb-1' : 'my-2'}>
        {items}
      </View>
    )
  }

  const renderListItem = (
    itemTokens: MarkdownIt.Token[],
    key: string,
    marker?: string,
    compact = false,
  ) => (
    <View key={key} className="flex flex-row items-start mb-1.5">
      {marker ? (
        <Text className="text-sm text-orange-500 font-semibold leading-relaxed mr-1.5" style={{ minWidth: '24px' }}>
          {marker}
        </Text>
      ) : (
        <View className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-2 mr-2" />
      )}
      <View className="flex-1 min-w-0">
        {renderTokens(itemTokens, 0, compact)}
      </View>
    </View>
  )

  const renderCodeBlock = (token: MarkdownIt.Token, key: string) => (
    <View key={key} className="my-2 bg-gray-900 rounded-lg p-3 overflow-hidden">
      {token.info ? <Text className="text-[10px] text-gray-400 mb-1">{token.info.trim()}</Text> : null}
      <Text
        className="text-xs text-green-300 font-mono leading-relaxed"
        selectable
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      >
        {token.content.replace(/\n$/, '')}
      </Text>
    </View>
  )

  const renderTable = (tableTokens: MarkdownIt.Token[], keyPrefix: string): JSX.Element => {
    const rows: JSX.Element[] = []
    let currentRow: JSX.Element[] = []
    let inHeader = false
    let currentCellHeader = false
    let rowIdx = 0

    for (let tIdx = 0; tIdx < tableTokens.length; tIdx++) {
      const token = tableTokens[tIdx]
      if (token.type === 'thead_open') {
        inHeader = true
      } else if (token.type === 'thead_close') {
        inHeader = false
      } else if (token.type === 'tr_open') {
        currentRow = []
      } else if (token.type === 'tr_close') {
        rows.push(
          <View
            key={`${keyPrefix}-row-${rowIdx}`}
            className={`flex flex-row border-b ${rowIdx === 0 ? 'border-gray-200 bg-gray-50' : 'border-gray-100'}`}
          >
            {currentRow}
          </View>,
        )
        rowIdx += 1
      } else if (token.type === 'th_open' || token.type === 'td_open') {
        currentCellHeader = inHeader || token.type === 'th_open'
      } else if (token.type === 'inline') {
        currentRow.push(
          <View
            key={`${keyPrefix}-cell-${rowIdx}-${currentRow.length}`}
            className="flex-1 p-2 min-w-0 border-r border-gray-100"
          >
            <Text className={`text-xs leading-relaxed ${currentCellHeader ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
              {renderInline(token.children || [])}
            </Text>
          </View>,
        )
      }
    }

    return (
      <View key={keyPrefix} className="my-3 border border-gray-200 rounded-lg overflow-hidden">
        {rows}
      </View>
    )
  }

  const renderInline = (inlineTokens: MarkdownIt.Token[]): JSX.Element[] => {
    const result: JSX.Element[] = []
    let idx = 0

    while (idx < inlineTokens.length) {
      const token = inlineTokens[idx]

      switch (token.type) {
        case 'text':
          result.push(
            <Text key={idx} className={textClass} style={{ whiteSpace: 'pre-wrap' }}>
              {token.content}
            </Text>,
          )
          idx += 1
          break

        case 'strong_open': {
          const end = findClosingToken(inlineTokens, idx, 'strong_open', 'strong_close')
          result.push(
            <Text key={`s-${idx}`} className="text-sm font-bold text-gray-900 leading-relaxed">
              {renderInline(inlineTokens.slice(idx + 1, end))}
            </Text>,
          )
          idx = end + 1
          break
        }

        case 'em_open': {
          const end = findClosingToken(inlineTokens, idx, 'em_open', 'em_close')
          result.push(
            <Text key={`em-${idx}`} className="text-sm italic text-gray-700 leading-relaxed">
              {renderInline(inlineTokens.slice(idx + 1, end))}
            </Text>,
          )
          idx = end + 1
          break
        }

        case 'code_inline':
          result.push(
            <Text key={idx} className="text-xs bg-gray-100 text-orange-700 px-1 py-0.5 rounded font-mono">
              {token.content}
            </Text>,
          )
          idx += 1
          break

        case 'link_open': {
          const end = findClosingToken(inlineTokens, idx, 'link_open', 'link_close')
          const href = token.attrGet('href') || ''
          result.push(
            <Text
              key={`l-${idx}`}
              className="text-sm text-blue-600 underline leading-relaxed"
              onClick={() => {
                if (href.startsWith('/')) Taro.navigateTo({ url: href })
              }}
            >
              {renderInline(inlineTokens.slice(idx + 1, end))}
            </Text>,
          )
          idx = end + 1
          break
        }

        case 'softbreak':
        case 'hardbreak':
          result.push(<Text key={idx}>{'\n'}</Text>)
          idx += 1
          break

        case 'image': {
          const src = token.attrGet('src') || ''
          if (src) {
            result.push(
              <Image
                key={idx}
                src={src}
                className="w-full h-40 object-cover rounded-lg my-2"
                mode="aspectFill"
                lazyLoad
              />,
            )
          }
          idx += 1
          break
        }

        default:
          if (token.content) {
            result.push(<Text key={idx} className={textClass}>{token.content}</Text>)
          }
          idx += 1
      }
    }

    return result
  }

  return <View className="markdown-content">{renderTokens(tokens)}</View>
}
