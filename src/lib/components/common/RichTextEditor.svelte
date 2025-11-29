<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import CharacterCount from '@tiptap/extension-character-count';
  import Image from '@tiptap/extension-image';
  import TextAlign from '@tiptap/extension-text-align';
  import Superscript from '@tiptap/extension-superscript';
  import Subscript from '@tiptap/extension-subscript';
  import Underline from '@tiptap/extension-underline';

  export let value: string = '';
  export let placeholder: string = 'Start typing...';
  export let maxLength: number | null = null;
  export let disabled: boolean = false;

  let editor: Editor | null = null;
  let editorElement: HTMLDivElement;
  let imageInput: HTMLInputElement;
  let uploadingImage = false;
  let previewMode = false;

  // Sync editor content with value prop, but only when not in preview mode
  // This reactive statement ensures content stays in sync, but we need to be careful
  // not to overwrite user input. Only sync when value changes externally.
  let lastSyncedValue = '';
  $: if (editor && !previewMode && value !== undefined && value !== lastSyncedValue) {
    const currentContent = editor.getHTML();
    // Only update if value is different from current content and different from last synced value
    if (value !== currentContent) {
      editor.commands.setContent(value, false);
      lastSyncedValue = value;
    }
  }

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3]
          }
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
          defaultAlignment: 'left'
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline hover:opacity-80',
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }),
        Placeholder.configure({
          placeholder
        }),
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              align: {
                default: null,
                parseHTML: (element) => {
                  const align = element.getAttribute('data-align') || 
                                (element.style.textAlign === 'left' ? 'left' :
                                 element.style.textAlign === 'center' ? 'center' :
                                 element.style.textAlign === 'right' ? 'right' : null);
                  return align;
                },
                renderHTML: (attributes) => {
                  if (!attributes.align) {
                    return { 'data-align': 'center' }; // Default to center
                  }
                  return {
                    'data-align': attributes.align
                  };
                }
              }
            };
          }
        }).configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg my-4'
          }
        }),
        Superscript,
        Subscript,
        Underline,
        CharacterCount.configure(
          maxLength !== null
            ? {
                limit: maxLength
              }
            : {}
        )
      ],
      content: value,
      editable: !disabled && !previewMode,
      onUpdate: ({ editor }) => {
        if (!previewMode) {
          const html = editor.getHTML();
          if (html !== value) {
            value = html;
            lastSyncedValue = html; // Update last synced value when user edits
          }
        }
      }
    });

    // Ensure editor is editable after initialization
    if (editor) {
      editor.setEditable(!disabled && !previewMode);
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function toggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function toggleHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  function toggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function toggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function setLink() {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  function removeLink() {
    editor?.chain().focus().unsetLink().run();
  }

  function setTextAlign(alignment: 'left' | 'center' | 'right' | 'justify') {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    
    // Check if an image is selected or if cursor is on an image
    let imageNode: any = null;
    let imagePos: number | null = null;
    
    // Check if selection is on an image node
    const nodeAt = state.doc.nodeAt(selection.from);
    if (nodeAt && nodeAt.type.name === 'image') {
      imageNode = nodeAt;
      imagePos = selection.from - 1;
    } else {
      // Check if an image is within the selection range
      state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (node.type.name === 'image') {
          imageNode = node;
          imagePos = pos;
          return false;
        }
      });
    }
    
    if (imageNode && imagePos !== null && imagePos >= 0) {
      // Apply alignment to image using updateAttributes
      const transaction = state.tr;
      const resolvedPos = state.doc.resolve(imagePos);
      if (resolvedPos.parent) {
        transaction.setNodeMarkup(imagePos, undefined, {
          ...imageNode.attrs,
          align: alignment === 'justify' ? 'center' : alignment // Justify doesn't make sense for images
        });
        editor.view.dispatch(transaction);
        editor.commands.focus();
      }
    } else {
      // Apply alignment to text
      editor.chain().focus().setTextAlign(alignment).run();
    }
  }
  
  function handleEditorClick() {
    if (editor && !previewMode && !disabled) {
      editor.commands.focus();
    }
  }

  function toggleSuperscript() {
    editor?.chain().focus().toggleSuperscript().run();
  }

  function toggleSubscript() {
    editor?.chain().focus().toggleSubscript().run();
  }

  function toggleUnderline() {
    editor?.chain().focus().toggleUnderline().run();
  }

  function clearFormatting() {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  }

  function togglePreview() {
    const wasInPreview = previewMode;
    previewMode = !previewMode;
    
    if (editor) {
      editor.setEditable(!previewMode && !disabled);
      
      // When switching back to edit mode from preview, restore content
      if (!previewMode && wasInPreview && value) {
        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
          if (editor) {
            const currentContent = editor.getHTML();
            // Only restore if content is different (might be empty or stale)
            if (value !== currentContent) {
              editor.commands.setContent(value, false);
              lastSyncedValue = value;
            }
          }
        });
      }
    }
  }

  function triggerImageUpload() {
    if (disabled || uploadingImage) return;
    imageInput?.click();
  }

  async function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !editor) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      target.value = '';
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
      target.value = '';
      return;
    }

    uploadingImage = true;

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const response = await fetch('/api/sponsor-admin/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload image');
      }

      // Insert image into editor
      editor.chain().focus().setImage({ src: result.imageUrl }).run();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      uploadingImage = false;
      target.value = '';
    }
  }

  $: isBold = editor?.isActive('bold') ?? false;
  $: isItalic = editor?.isActive('italic') ?? false;
  $: isStrike = editor?.isActive('strike') ?? false;
  $: isHeading1 = editor?.isActive('heading', { level: 1 }) ?? false;
  $: isHeading2 = editor?.isActive('heading', { level: 2 }) ?? false;
  $: isHeading3 = editor?.isActive('heading', { level: 3 }) ?? false;
  $: isBulletList = editor?.isActive('bulletList') ?? false;
  $: isOrderedList = editor?.isActive('orderedList') ?? false;
  $: isLink = editor?.isActive('link') ?? false;
  $: isSuperscript = editor?.isActive('superscript') ?? false;
  $: isSubscript = editor?.isActive('subscript') ?? false;
  $: isUnderline = editor?.isActive('underline') ?? false;
  $: textAlign = editor?.getAttributes('textAlign')?.textAlign || 'left';
  $: characterCount = editor?.storage.characterCount?.characters() ?? 0;
  $: isAtLimit = maxLength !== null && characterCount >= maxLength;
</script>

<div class="rich-text-editor">
  <!-- Toolbar -->
  <div class="toolbar border-b border-gray-300 p-2 flex flex-wrap gap-1 bg-gray-50 rounded-t-lg">
    <!-- Preview Toggle -->
    <button
      type="button"
      on:click={togglePreview}
      class="toolbar-button mr-auto"
      class:active={previewMode}
      disabled={disabled}
      title={previewMode ? 'Edit Mode' : 'Preview Mode'}
    >
      {#if previewMode}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
      {/if}
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <button
      type="button"
      on:click={toggleBold}
      class="toolbar-button"
      class:active={isBold}
      disabled={disabled}
      title="Bold"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M8 11h4.5a2.5 2.5 0 0 0 0-5H8v5zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.5 7.5 4.5 4.5 0 0 1 2.5 4zm-6.5-9.5H8v5h3.5a2.5 2.5 0 0 0 0-5zm0 9.5H8v5h4.5a2.5 2.5 0 0 0 0-5z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleItalic}
      class="toolbar-button"
      class:active={isItalic}
      disabled={disabled}
      title="Italic"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleStrike}
      class="toolbar-button"
      class:active={isStrike}
      disabled={disabled || previewMode}
      title="Strikethrough"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M5 4v3h5.5v12h3V7H19V4H5zm2 19h10v-2H7v2z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleUnderline}
      class="toolbar-button"
      class:active={isUnderline}
      disabled={disabled || previewMode}
      title="Underline"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleSuperscript}
      class="toolbar-button"
      class:active={isSuperscript}
      disabled={disabled || previewMode}
      title="Superscript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M22 7h-2v1h2v1h-3v-1h-2V7h2V6h-3V4h5v3zm-7.5 5h-3L9 20h2.2l.8-2h3.2l.8 2H16l-1.5-8zm-1.5 2.5L13 18h-2l1.5-3.5zM4 4h2v16H4z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleSubscript}
      class="toolbar-button"
      class:active={isSubscript}
      disabled={disabled || previewMode}
      title="Subscript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M22 18h-2v1h3v1h-4v-2c0-.55.45-1 1-1h2v-1h-3v-1h3c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1zM5.88 18h2.66l3.4-5.42h.12l3.4 5.42h2.66l-4.65-7.27L17.81 4h-2.66l-3.4 5.42h-.12L7.23 4H4.58l4.65 6.73L5.88 18z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={clearFormatting}
      class="toolbar-button"
      disabled={disabled || previewMode}
      title="Clear Formatting"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
      </svg>
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <button
      type="button"
      on:click={() => toggleHeading(1)}
      class="toolbar-button"
      class:active={isHeading1}
      disabled={disabled}
      title="Heading 1"
    >
      H1
    </button>
    <button
      type="button"
      on:click={() => toggleHeading(2)}
      class="toolbar-button"
      class:active={isHeading2}
      disabled={disabled}
      title="Heading 2"
    >
      H2
    </button>
    <button
      type="button"
      on:click={() => toggleHeading(3)}
      class="toolbar-button"
      class:active={isHeading3}
      disabled={disabled}
      title="Heading 3"
    >
      H3
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <button
      type="button"
      on:click={toggleBulletList}
      class="toolbar-button"
      class:active={isBulletList}
      disabled={disabled}
      title="Bullet List"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={toggleOrderedList}
      class="toolbar-button"
      class:active={isOrderedList}
      disabled={disabled}
      title="Numbered List"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
      </svg>
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <button
      type="button"
      on:click={isLink ? removeLink : setLink}
      class="toolbar-button"
      class:active={isLink}
      disabled={disabled}
      title={isLink ? 'Remove Link' : 'Add Link'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
      </svg>
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <button
      type="button"
      on:click={triggerImageUpload}
      class="toolbar-button"
      disabled={disabled || uploadingImage || previewMode}
      title="Upload Image"
    >
      {#if uploadingImage}
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      {/if}
    </button>
    <div class="w-px h-6 bg-gray-300 mx-1"></div>
    <!-- Text Alignment -->
    <button
      type="button"
      on:click={() => setTextAlign('left')}
      class="toolbar-button"
      class:active={textAlign === 'left'}
      disabled={disabled || previewMode}
      title="Align Left"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={() => setTextAlign('center')}
      class="toolbar-button"
      class:active={textAlign === 'center'}
      disabled={disabled || previewMode}
      title="Align Center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={() => setTextAlign('right')}
      class="toolbar-button"
      class:active={textAlign === 'right'}
      disabled={disabled || previewMode}
      title="Align Right"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
      </svg>
    </button>
    <button
      type="button"
      on:click={() => setTextAlign('justify')}
      class="toolbar-button"
      class:active={textAlign === 'justify'}
      disabled={disabled || previewMode}
      title="Justify"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" />
      </svg>
    </button>
  </div>

  <!-- Hidden file input for image upload -->
  <input
    type="file"
    bind:this={imageInput}
    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
    class="hidden"
    on:change={handleImageUpload}
  />

  <!-- Editor or Preview -->
  {#if previewMode}
    <div class="editor-content prose prose-sm max-w-none p-4 min-h-[200px] rounded-b-lg border border-t-0 border-gray-300 bg-white">
      {@html value || '<p class="text-gray-400">No content to preview</p>'}
    </div>
  {:else}
    <div
      bind:this={editorElement}
      data-testid="rich-text-editor"
      on:click={handleEditorClick}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleEditorClick();
        }
      }}
      role="textbox"
      tabindex="0"
      class="editor-content prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none rounded-b-lg border border-t-0 border-gray-300 cursor-text"
    ></div>
  {/if}

  <!-- Character Count -->
  {#if maxLength}
    <div class="text-right text-sm mt-1 px-2" class:text-red-600={isAtLimit} class:text-gray-500={!isAtLimit}>
      {characterCount} / {maxLength} characters
    </div>
  {/if}
</div>

<style>
  :global(.rich-text-editor .toolbar-button) {
    @apply p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }

  :global(.rich-text-editor .toolbar-button.active) {
    @apply bg-primary text-white hover:bg-primary-light;
  }

  :global(.rich-text-editor .editor-content) {
    @apply focus-within:ring-2 focus-within:ring-primary focus-within:border-primary;
  }

  :global(.rich-text-editor .editor-content .ProseMirror) {
    @apply outline-none;
  }

  :global(.rich-text-editor .editor-content .ProseMirror p.is-editor-empty:first-child::before) {
    @apply text-gray-400 float-left h-0 pointer-events-none;
    content: attr(data-placeholder);
  }

  :global(.rich-text-editor .editor-content ul),
  :global(.rich-text-editor .editor-content ol) {
    @apply pl-6 my-2;
  }

  :global(.rich-text-editor .editor-content ul) {
    @apply list-disc;
  }

  :global(.rich-text-editor .editor-content ol) {
    @apply list-decimal;
  }

  :global(.rich-text-editor .editor-content h1) {
    @apply text-2xl font-bold mt-4 mb-2;
  }

  :global(.rich-text-editor .editor-content h2) {
    @apply text-xl font-semibold mt-3 mb-2;
  }

  :global(.rich-text-editor .editor-content h3) {
    @apply text-lg font-semibold mt-2 mb-1;
  }

  :global(.rich-text-editor .editor-content p) {
    @apply my-2;
  }

  :global(.rich-text-editor .editor-content a) {
    @apply text-primary underline hover:opacity-80;
  }

  :global(.rich-text-editor .editor-content strong) {
    @apply font-bold;
  }

  :global(.rich-text-editor .editor-content em) {
    @apply italic;
  }

  :global(.rich-text-editor .editor-content s) {
    @apply line-through;
  }

  :global(.rich-text-editor .editor-content img) {
    @apply max-w-full h-auto rounded-lg my-4 block mx-auto;
    cursor: pointer;
  }

  :global(.rich-text-editor .editor-content img[data-align="left"]) {
    margin-left: 0 !important;
    margin-right: auto !important;
  }

  :global(.rich-text-editor .editor-content img[data-align="center"]) {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  :global(.rich-text-editor .editor-content img[data-align="right"]) {
    margin-left: auto !important;
    margin-right: 0 !important;
  }

  /* Text Alignment Styles */
  :global(.rich-text-editor .editor-content [style*="text-align: left"]) {
    @apply text-left;
  }

  :global(.rich-text-editor .editor-content [style*="text-align: center"]) {
    @apply text-center;
  }

  :global(.rich-text-editor .editor-content [style*="text-align: right"]) {
    @apply text-right;
  }

  :global(.rich-text-editor .editor-content [style*="text-align: justify"]) {
    @apply text-justify;
  }

  /* Preview mode styling */
  :global(.rich-text-editor .editor-content.preview) {
    @apply bg-white;
  }
</style>

