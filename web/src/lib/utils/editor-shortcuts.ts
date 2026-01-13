import { keymap } from "@codemirror/view"
import { undo, redo } from "@codemirror/commands"

/**
 * Basic text formatting shortcuts for the transcript editor
 * - Cmd+B: Bold (**text**)
 * - Cmd+I: Italic (*text*)
 * - Cmd+U: Underline (<u>text</u>)
 * - Cmd+Shift+X: Strikethrough (~~text~~)
 */
export const basicFormattingKeymap = keymap.of([
  { 
    key: "Mod-b", 
    run: (view) => {
      const { from, to } = view.state.selection.main
      if (from === to) return false
      const text = view.state.doc.sliceString(from, to)
      const newText = `**${text}**`
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: to + 2 }
      })
      return true
    }
  },
  { 
    key: "Mod-i", 
    run: (view) => {
      const { from, to } = view.state.selection.main
      if (from === to) return false
      const text = view.state.doc.sliceString(from, to)
      const newText = `*${text}*`
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 1, head: to + 1 }
      })
      return true
    }
  },
  { 
    key: "Mod-u", 
    run: (view) => {
      const { from, to } = view.state.selection.main
      if (from === to) return false
      const text = view.state.doc.sliceString(from, to)
      const newText = `<u>${text}</u>`
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 3, head: to + 3 }
      })
      return true
    }
  },
  { 
    key: "Mod-Shift-x", 
    run: (view) => {
      const { from, to } = view.state.selection.main
      if (from === to) return false
      const text = view.state.doc.sliceString(from, to)
      const newText = `~~${text}~~`
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: to + 2 }
      })
      return true
    }
  }
])

/**
 * Standard editor shortcuts (undo/redo)
 */
export const standardEditorKeymap = keymap.of([
  { key: "Mod-z", run: undo },
  { key: "Mod-Shift-z", run: redo },
])
