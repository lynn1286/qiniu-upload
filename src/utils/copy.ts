/**
 * @description: 将文本复制到剪贴板
 * @param {string} input
 * @param {*} param2
 * @return {*}
 */
export function copyTextToClipboard(input: string, { target = document.body } = {}) {
  const element = document.createElement('textarea')
  const previouslyFocusedElement = document.activeElement
  element.value = input
  element.setAttribute('readonly', '')

  element.style.contain = 'strict'
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.fontSize = '12pt'

  const selection = document.getSelection()
  let originalRange: false | Range = false
  if (selection && selection.rangeCount > 0) {
    originalRange = selection.getRangeAt(0)
  }

  target.append(element)
  element.select()

  element.selectionStart = 0
  element.selectionEnd = input.length

  let isSuccess = false
  try {
    isSuccess = document.execCommand('copy')
  } catch {}

  element.remove()

  if (originalRange) {
    selection?.removeAllRanges()
    selection?.addRange(originalRange)
  }

  if (previouslyFocusedElement) {
    // @ts-expect-error
    previouslyFocusedElement.focus()
  }

  return isSuccess
}
