function inlineMarkdown(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

export function renderMarkdown(value: string) {
  const output: string[] = []
  let list = ''
  let paragraph: string[] = []
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${paragraph.join('<br>')}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (list) output.push(`</${list}>`)
    list = ''
  }

  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/)
    if (heading) {
      flushParagraph(); closeList()
      const level = heading[1].length
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
    } else if (ordered || unordered) {
      flushParagraph()
      const nextList = ordered ? 'ol' : 'ul'
      if (list !== nextList) { closeList(); output.push(`<${nextList}>`); list = nextList }
      output.push(`<li>${inlineMarkdown((ordered || unordered)![1])}</li>`)
    } else if (/^\s*$/.test(line)) {
      flushParagraph(); closeList()
    } else {
      closeList()
      paragraph.push(inlineMarkdown(line))
    }
  }
  flushParagraph(); closeList()
  return output.join('')
}
