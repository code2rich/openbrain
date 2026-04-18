import type { PluginSimple } from 'markdown-it'
import type { StateInline } from 'markdown-it/lib/rules_inline'

interface WikiLinkOptions {
  slugMap: Record<string, string>
}

const CONTENT_PREFIX = '/wiki'

export const wikiLinkPlugin: PluginSimple = (md, options?: any) => {
  const { slugMap } = (options || {}) as WikiLinkOptions

  md.inline.ruler.before('link', 'wiki_link', (state: StateInline, silent: boolean): boolean => {
    const start = state.pos
    const max = state.posMax

    // Check for [[
    if (state.src.charCodeAt(start) !== 0x5B /* [ */ || state.src.charCodeAt(start + 1) !== 0x5B) {
      return false
    }

    // Find ]]
    let pos = start + 2
    let end = -1
    while (pos < max - 1) {
      if (state.src.charCodeAt(pos) === 0x5D && state.src.charCodeAt(pos + 1) === 0x5D) {
        end = pos
        break
      }
      pos++
    }

    if (end === -1) return false

    const raw = state.src.slice(start + 2, end)

    // Parse [[slug|display text]] or [[slug]]
    const pipeIndex = raw.indexOf('|')
    const slug = (pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)).trim()
    const displayText = (pipeIndex === -1 ? raw : raw.slice(pipeIndex + 1)).trim()

    if (!slug) return false

    if (silent) return true

    // Resolve slug to path
    const resolved = slugMap?.[slug]
    const href = resolved || `${CONTENT_PREFIX}/${slug}`
    const isBroken = !resolved

    const token = state.push('link_open', 'a', 1)
    token.attrSet('href', href)
    token.attrSet('class', isBroken ? 'wiki-link broken' : 'wiki-link')

    const textToken = state.push('text', '', 0)
    textToken.content = displayText || slug

    state.push('link_close', 'a', -1)

    state.pos = end + 2
    return true
  })
}
