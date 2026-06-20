'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from 'tiptap-markdown'
import { useEffect } from 'react'
import { Bold, Italic, List, ListOrdered, Strikethrough } from 'lucide-react'

/** tiptap-markdown augments editor.storage but doesn't ship the types for it. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()
}

/**
 * A lightweight rich-text editor for project-log notes. Built on TipTap so we
 * get real document behaviour for free:
 *   • Enter inside a list spawns the next bullet/number
 *   • Tab nests (sub-bullet), Shift+Tab outdents
 *   • Bold / italic / strike toggles
 * The value is round-tripped as Markdown so the timeline can keep rendering with
 * ReactMarkdown (and stored content stays human-readable + safe).
 */
export function RichEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
}: {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    editorProps: {
      attributes: { class: 'ops-prose' },
    },
    onUpdate: ({ editor }) => {
      onChange(getMarkdown(editor))
    },
  })

  // Reset editor content when the value is cleared externally (after submit).
  useEffect(() => {
    if (!editor) return
    const current = getMarkdown(editor)
    if (value === '' && current !== '') {
      editor.commands.clearContent()
    }
  }, [value, editor])

  if (!editor) {
    return <div className="ops-editor"><div className="ops-editor__loading" /></div>
  }

  const Btn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active: boolean
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`ops-editor__btn ${active ? 'ops-editor__btn--active' : ''}`}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="ops-editor">
      <div className="ops-editor__toolbar">
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
          <Bold size={12} />
        </Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
          <Italic size={12} />
        </Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough size={12} />
        </Btn>
        <span className="ops-editor__divider" />
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List size={12} />
        </Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered size={12} />
        </Btn>
        <span className="ops-editor__hint font-pixel">Tab to indent · Enter for next item</span>
      </div>
      <EditorContent editor={editor} className="ops-editor__content" />
    </div>
  )
}
