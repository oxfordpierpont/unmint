'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  FilePlus2,
  FolderPlus,
  ImagePlus,
  Loader2,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type MetaContent = {
  title?: string
  pages?: string[]
  defaultOpen?: boolean
}

type SiteLink = {
  label: string
  href: string
  matchPrefix?: string
}

type SiteContent = {
  topNav: SiteLink[]
  footer: {
    companyName: string
    links: SiteLink[]
  }
}

type AdminSnapshot = {
  setup: {
    repository: string
    branch: string
    canPublish: boolean
    contentRoot: string
    imageRoot: string
    siteContentPath: string
  }
  docs: string[]
  metaFiles: Array<{ path: string; content: MetaContent | null }>
  images: string[]
  siteContent: SiteContent | null
}

type Tab = 'menus' | 'documents' | 'links' | 'images'

type PublishFile = {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

type PublishDeletion = {
  path: string
}

const emptySiteContent: SiteContent = {
  topNav: [],
  footer: {
    companyName: '',
    links: [],
  },
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromSlug(value: string) {
  return value
    .split(/[/-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function folderFromMetaPath(path: string) {
  return path.replace(/\/meta\.json$/, '')
}

function relativeDocSlug(path: string, root: string) {
  return path.replace(`${root}/`, '').replace(/\.(mdx|md)$/i, '')
}

function pageSlugFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.(mdx|md)$/i, '') || ''
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.')
  }

  return data as T
}

function moveItem(items: string[], index: number, direction: -1 | 1) {
  const next = [...items]
  const target = index + direction

  if (target < 0 || target >= items.length) {
    return next
  }

  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

function moveLink(items: SiteLink[], index: number, direction: -1 | 1) {
  const next = [...items]
  const target = index + direction

  if (target < 0 || target >= items.length) {
    return next
  }

  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function DocsAdminClient({ userEmail }: { userEmail: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('menus')
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null)
  const [selectedMetaPath, setSelectedMetaPath] = useState('')
  const [selectedDocPath, setSelectedDocPath] = useState('')
  const [selectedImagePath, setSelectedImagePath] = useState('')
  const [docContent, setDocContent] = useState('')
  const [newMenuItem, setNewMenuItem] = useState('')
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocSlug, setNewDocSlug] = useState('')
  const [newDocExtension, setNewDocExtension] = useState<'mdx' | 'md'>('mdx')
  const [newFolderTitle, setNewFolderTitle] = useState('')
  const [newFolderSlug, setNewFolderSlug] = useState('')
  const [newFolderCollapsed, setNewFolderCollapsed] = useState(true)
  const [siteContent, setSiteContent] = useState<SiteContent>(emptySiteContent)
  const [imageSnippet, setImageSnippet] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const selectedMeta = useMemo(
    () => snapshot?.metaFiles.find((item) => item.path === selectedMetaPath)?.content || null,
    [snapshot, selectedMetaPath],
  )

  const selectedPages = selectedMeta?.pages || []
  const selectedMetaFolder = selectedMetaPath ? folderFromMetaPath(selectedMetaPath) : ''

  async function refresh() {
    setPending(true)
    setError('')
    setStatus('')

    try {
      const data = await fetchJson<AdminSnapshot>('/api/admin/docs')
      setSnapshot(data)
      setSiteContent(data.siteContent || emptySiteContent)
      setSelectedMetaPath((current) => current || data.metaFiles[0]?.path || '')
      setSelectedDocPath((current) => current || data.docs[0] || '')
      setSelectedImagePath((current) => current || data.images[0] || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load docs admin.')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!selectedDocPath) {
      setDocContent('')
      return
    }

    let cancelled = false
    setPending(true)
    setError('')

    fetchJson<{ content: string }>(`/api/admin/docs/file?path=${encodeURIComponent(selectedDocPath)}`)
      .then((file) => {
        if (!cancelled) {
          setDocContent(file.content)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load document.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPending(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedDocPath])

  function updateSelectedMeta(updater: (meta: MetaContent) => MetaContent) {
    if (!snapshot || !selectedMetaPath) {
      return
    }

    setSnapshot({
      ...snapshot,
      metaFiles: snapshot.metaFiles.map((item) =>
        item.path === selectedMetaPath ? { ...item, content: updater(item.content || {}) } : item,
      ),
    })
  }

  async function publish(files: PublishFile[], deletions: PublishDeletion[] = [], message = 'Update docs content') {
    setPending(true)
    setError('')
    setStatus('')

    try {
      const result = await fetchJson<{ sha: string; branch: string }>('/api/admin/docs/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, files, deletions }),
      })
      setStatus(`Published ${result.sha.slice(0, 7)} to ${result.branch}. Dokploy will rebuild from GitHub.`)
      await refresh()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish changes.')
    } finally {
      setPending(false)
    }
  }

  function addMenuItem() {
    const item = newMenuItem.trim()

    if (!item) {
      return
    }

    updateSelectedMeta((meta) => ({ ...meta, pages: [...(meta.pages || []), item] }))
    setNewMenuItem('')
  }

  function saveSelectedMenu() {
    if (!selectedMetaPath || !selectedMeta) {
      return
    }

    publish(
      [{ path: selectedMetaPath, content: `${JSON.stringify(selectedMeta, null, 2)}\n` }],
      [],
      `Update docs menu ${selectedMeta.title || selectedMetaPath}`,
    )
  }

  function createDocument() {
    if (!snapshot || !selectedMetaPath) {
      return
    }

    const title = newDocTitle.trim()
    const slug = slugify(newDocSlug || title)

    if (!title || !slug) {
      setError('Document title and slug are required.')
      return
    }

    const path = `${selectedMetaFolder}/${slug}.${newDocExtension}`
    const nextMeta = {
      ...(selectedMeta || {}),
      pages: [...selectedPages, slug],
    }
    const content = `---\ntitle: \"${title.replace(/"/g, '\\"')}\"\ndescription: \"\"\n---\n\n# ${title}\n\n`

    publish(
      [
        { path, content },
        { path: selectedMetaPath, content: `${JSON.stringify(nextMeta, null, 2)}\n` },
      ],
      [],
      `Add docs page ${title}`,
    )
    setNewDocTitle('')
    setNewDocSlug('')
  }

  function createFolder() {
    if (!selectedMetaPath) {
      return
    }

    const title = newFolderTitle.trim()
    const slug = slugify(newFolderSlug || title)

    if (!title || !slug) {
      setError('Folder title and slug are required.')
      return
    }

    const folderPath = `${selectedMetaFolder}/${slug}`
    const nextParentMeta = {
      ...(selectedMeta || {}),
      pages: [...selectedPages, slug],
    }
    const folderMeta: MetaContent = {
      title,
      pages: ['index'],
      defaultOpen: !newFolderCollapsed,
    }
    const indexContent = `---\ntitle: \"${title.replace(/"/g, '\\"')}\"\ndescription: \"\"\n---\n\n# ${title}\n\n`

    publish(
      [
        { path: selectedMetaPath, content: `${JSON.stringify(nextParentMeta, null, 2)}\n` },
        { path: `${folderPath}/meta.json`, content: `${JSON.stringify(folderMeta, null, 2)}\n` },
        { path: `${folderPath}/index.mdx`, content: indexContent },
      ],
      [],
      `Add docs folder ${title}`,
    )
    setNewFolderTitle('')
    setNewFolderSlug('')
  }

  function saveDocument() {
    if (!selectedDocPath) {
      return
    }

    publish([{ path: selectedDocPath, content: docContent }], [], `Update docs page ${pageSlugFromPath(selectedDocPath)}`)
  }

  function deleteDocument() {
    if (!selectedDocPath || !window.confirm(`Delete ${selectedDocPath}?`)) {
      return
    }

    const slug = pageSlugFromPath(selectedDocPath)
    const containingMetaPath = `${selectedDocPath.replace(/\/[^/]+$/, '')}/meta.json`
    const containingMeta = snapshot?.metaFiles.find((item) => item.path === containingMetaPath)?.content
    const files = []

    if (containingMeta?.pages?.includes(slug)) {
      files.push({
        path: containingMetaPath,
        content: `${JSON.stringify({ ...containingMeta, pages: containingMeta.pages.filter((item) => item !== slug) }, null, 2)}\n`,
      })
    }

    publish(files, [{ path: selectedDocPath }], `Remove docs page ${slug}`)
  }

  function saveSiteContent() {
    if (!snapshot) {
      return
    }

    publish(
      [{ path: snapshot.setup.siteContentPath, content: `${JSON.stringify(siteContent, null, 2)}\n` }],
      [],
      'Update docs navigation links',
    )
  }

  async function uploadImage(file: File | null) {
    if (!file || !snapshot) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeName = `${slugify(file.name.replace(/\.[^.]+$/, '')) || 'image'}.${extension}`
    const path = `${snapshot.setup.imageRoot}/${safeName}`
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read image.'))
      reader.readAsDataURL(file)
    })
    const base64 = dataUrl.split(',')[1] || ''

    await publish([{ path, content: base64, encoding: 'base64' }], [], `Upload docs image ${safeName}`)
    setImageSnippet(`![${file.name.replace(/\.[^.]+$/, '')}](/images/${safeName})`)
  }

  function deleteImage() {
    if (!selectedImagePath || !window.confirm(`Delete ${selectedImagePath}?`)) {
      return
    }

    publish([], [{ path: selectedImagePath }], `Remove docs image ${selectedImagePath.split('/').pop()}`)
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#0b0d12] dark:bg-[#0b0d12] dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Secure Docs Admin</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Manage documentation</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as {userEmail}. Publishing creates a GitHub commit and lets Dokploy rebuild the site.
            </p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={pending}>
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCcw data-icon="inline-start" />}
            Refresh
          </Button>
        </header>

        {snapshot && !snapshot.setup.canPublish ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTitle>Publishing needs one secret</AlertTitle>
            <AlertDescription>
              Add DOCS_ADMIN_GITHUB_TOKEN in Dokploy with write access to {snapshot.setup.repository}. Reading works now;
              publishing is blocked until that token exists.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {status ? (
          <Alert>
            <AlertTitle>Published</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {[
            ['menus', 'Menus and folders'],
            ['documents', 'Documents'],
            ['links', 'Top bar and footer'],
            ['images', 'Images'],
          ].map(([tab, label]) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab as Tab)}
            >
              {label}
            </Button>
          ))}
        </div>

        {snapshot ? (
          <>
            {activeTab === 'menus' ? (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Sidebar structure</CardTitle>
                  <CardDescription>Add, remove, collapse, and reorder sidebar folders and documents.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-[320px_1fr]">
                  <Field>
                    <FieldLabel>Menu file</FieldLabel>
                    <select
                      value={selectedMetaPath}
                      onChange={(event) => setSelectedMetaPath(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {snapshot.metaFiles.map((item) => (
                        <option key={item.path} value={item.path}>
                          {item.content?.title || item.path.replace(`${snapshot.setup.contentRoot}/`, '')}
                        </option>
                      ))}
                    </select>
                    <FieldDescription>Each folder has its own menu file.</FieldDescription>
                  </Field>

                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                      <Field>
                        <FieldLabel>Folder title</FieldLabel>
                        <Input
                          value={selectedMeta?.title || ''}
                          onChange={(event) => updateSelectedMeta((meta) => ({ ...meta, title: event.target.value }))}
                        />
                      </Field>
                      <label className="flex items-end gap-2 pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedMeta?.defaultOpen !== false}
                          onChange={(event) => updateSelectedMeta((meta) => ({ ...meta, defaultOpen: event.target.checked }))}
                        />
                        Open by default
                      </label>
                    </div>

                    <div className="rounded-md border border-border">
                      {selectedPages.map((page, index) => (
                        <div key={`${page}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                          <Input
                            value={page}
                            onChange={(event) =>
                              updateSelectedMeta((meta) => ({
                                ...meta,
                                pages: (meta.pages || []).map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                              }))
                            }
                          />
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => updateSelectedMeta((meta) => ({ ...meta, pages: moveItem(meta.pages || [], index, -1) }))}>
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => updateSelectedMeta((meta) => ({ ...meta, pages: moveItem(meta.pages || [], index, 1) }))}>
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateSelectedMeta((meta) => ({ ...meta, pages: (meta.pages || []).filter((_, itemIndex) => itemIndex !== index) }))}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Input value={newMenuItem} onChange={(event) => setNewMenuItem(event.target.value)} placeholder="document-or-folder-slug" />
                      <Button variant="outline" onClick={addMenuItem}>Add menu item</Button>
                    </div>

                    <Button onClick={saveSelectedMenu} disabled={pending || !snapshot.setup.canPublish}>
                      <Save data-icon="inline-start" />
                      Publish menu changes
                    </Button>

                    <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>New folder title</FieldLabel>
                        <Input value={newFolderTitle} onChange={(event) => setNewFolderTitle(event.target.value)} placeholder="Product Notes" />
                      </Field>
                      <Field>
                        <FieldLabel>New folder slug</FieldLabel>
                        <Input value={newFolderSlug} onChange={(event) => setNewFolderSlug(event.target.value)} placeholder={slugify(newFolderTitle) || 'product-notes'} />
                      </Field>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newFolderCollapsed} onChange={(event) => setNewFolderCollapsed(event.target.checked)} />
                        Collapsed by default
                      </label>
                      <Button onClick={createFolder} disabled={pending || !snapshot.setup.canPublish}>
                        <FolderPlus data-icon="inline-start" />
                        Create folder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === 'documents' ? (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Create, edit, delete, and publish .md or .mdx files.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-[320px_1fr]">
                  <div className="flex flex-col gap-4">
                    <Field>
                      <FieldLabel>Document</FieldLabel>
                      <select
                        value={selectedDocPath}
                        onChange={(event) => setSelectedDocPath(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {snapshot.docs.map((path) => (
                          <option key={path} value={path}>
                            {relativeDocSlug(path, snapshot.setup.contentRoot)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid gap-3 rounded-md border border-border p-4">
                      <Field>
                        <FieldLabel>New document title</FieldLabel>
                        <Input value={newDocTitle} onChange={(event) => setNewDocTitle(event.target.value)} placeholder="Implementation Notes" />
                      </Field>
                      <Field>
                        <FieldLabel>New document slug</FieldLabel>
                        <Input value={newDocSlug} onChange={(event) => setNewDocSlug(event.target.value)} placeholder={slugify(newDocTitle) || 'implementation-notes'} />
                      </Field>
                      <Field>
                        <FieldLabel>Format</FieldLabel>
                        <select
                          value={newDocExtension}
                          onChange={(event) => setNewDocExtension(event.target.value as 'mdx' | 'md')}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="mdx">.mdx</option>
                          <option value="md">.md</option>
                        </select>
                      </Field>
                      <Button onClick={createDocument} disabled={pending || !snapshot.setup.canPublish}>
                        <FilePlus2 data-icon="inline-start" />
                        Create in selected menu
                      </Button>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {selectedDocPath}
                    </div>
                    <textarea
                      value={docContent}
                      onChange={(event) => setDocContent(event.target.value)}
                      className="min-h-[560px] w-full resize-y rounded-md border border-input bg-background p-4 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                      spellCheck={false}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveDocument} disabled={pending || !snapshot.setup.canPublish}>
                        <Save data-icon="inline-start" />
                        Publish document
                      </Button>
                      <Button variant="destructive" onClick={deleteDocument} disabled={pending || !snapshot.setup.canPublish}>
                        <Trash2 data-icon="inline-start" />
                        Delete document
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === 'links' ? (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Top bar and footer</CardTitle>
                  <CardDescription>Reorder, add, and remove top navigation tabs and footer links.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                  <LinkEditor
                    title="Top bar"
                    links={siteContent.topNav}
                    includeMatchPrefix
                    onChange={(links) => setSiteContent({ ...siteContent, topNav: links })}
                  />
                  <div className="flex flex-col gap-4">
                    <Field>
                      <FieldLabel>Footer company name</FieldLabel>
                      <Input
                        value={siteContent.footer.companyName}
                        onChange={(event) => setSiteContent({ ...siteContent, footer: { ...siteContent.footer, companyName: event.target.value } })}
                      />
                    </Field>
                    <LinkEditor
                      title="Footer links"
                      links={siteContent.footer.links}
                      onChange={(links) => setSiteContent({ ...siteContent, footer: { ...siteContent.footer, links } })}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Button onClick={saveSiteContent} disabled={pending || !snapshot.setup.canPublish}>
                      <Save data-icon="inline-start" />
                      Publish top bar and footer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === 'images' ? (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                  <CardDescription>Upload images and paste the generated Markdown snippet into any document.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-[320px_1fr]">
                  <div className="flex flex-col gap-4">
                    <Field>
                      <FieldLabel>Upload image</FieldLabel>
                      <Input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0] || null)} disabled={pending || !snapshot.setup.canPublish} />
                    </Field>
                    <Field>
                      <FieldLabel>Existing image</FieldLabel>
                      <select
                        value={selectedImagePath}
                        onChange={(event) => setSelectedImagePath(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {snapshot.images.map((path) => (
                          <option key={path} value={path}>
                            {path.replace(`${snapshot.setup.imageRoot}/`, '')}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Button variant="destructive" onClick={deleteImage} disabled={pending || !selectedImagePath || !snapshot.setup.canPublish}>
                      <Trash2 data-icon="inline-start" />
                      Delete image
                    </Button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {selectedImagePath ? (
                      <div className="overflow-hidden rounded-md border border-border bg-white p-4 dark:bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/${selectedImagePath.replace('packages/template/public/', '')}`}
                          alt=""
                          className="max-h-[360px] max-w-full object-contain"
                        />
                      </div>
                    ) : null}
                    <Field>
                      <FieldLabel>Markdown snippet</FieldLabel>
                      <Input
                        readOnly
                        value={imageSnippet || (selectedImagePath ? `![${titleFromSlug(selectedImagePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'image')}](/${selectedImagePath.replace('packages/template/public/', '')})` : '')}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
              <Loader2 className={cn('size-4', pending && 'animate-spin')} />
              Loading docs admin...
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function LinkEditor({
  title,
  links,
  includeMatchPrefix = false,
  onChange,
}: {
  title: string
  links: SiteLink[]
  includeMatchPrefix?: boolean
  onChange: (links: SiteLink[]) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-md border border-border">
        {links.map((link, index) => (
          <div key={`${link.href}-${index}`} className="grid gap-2 border-b border-border p-3 last:border-b-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={link.label}
                onChange={(event) => onChange(links.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))}
                placeholder="Label"
              />
              <Input
                value={link.href}
                onChange={(event) => onChange(links.map((item, itemIndex) => (itemIndex === index ? { ...item, href: event.target.value } : item)))}
                placeholder="https://example.com"
              />
            </div>
            {includeMatchPrefix ? (
              <Input
                value={link.matchPrefix || ''}
                onChange={(event) => onChange(links.map((item, itemIndex) => (itemIndex === index ? { ...item, matchPrefix: event.target.value } : item)))}
                placeholder="/docs/path"
              />
            ) : null}
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onChange(moveLink(links, index, -1))}>
                <ArrowUp className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onChange(moveLink(links, index, 1))}>
                <ArrowDown className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onChange(links.filter((_, itemIndex) => itemIndex !== index))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={() =>
          onChange([
            ...links,
            includeMatchPrefix
              ? { label: 'New link', href: '/docs', matchPrefix: '/docs' }
              : { label: 'New link', href: 'https://aiconnected.ai' },
          ])
        }
      >
        Add link
      </Button>
    </div>
  )
}
