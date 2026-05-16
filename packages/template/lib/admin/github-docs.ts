type GitTreeEntry = {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url?: string
}

type GitTreeResponse = {
  sha: string
  tree: GitTreeEntry[]
  truncated: boolean
}

type GitHubFileChange = {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

type GitHubDeleteChange = {
  path: string
}

const DEFAULT_REPOSITORY = 'oxfordpierpont/unmint'
const DEFAULT_BRANCH = 'main'
const DOCS_ROOT = 'packages/template/content/docs'
const IMAGE_ROOT = 'packages/template/public/images'
const SITE_CONTENT_PATH = 'packages/template/lib/site-content.json'

function getGitHubConfig() {
  const repository = process.env.DOCS_ADMIN_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY
  const branch = process.env.DOCS_ADMIN_GITHUB_BRANCH || process.env.GITHUB_BRANCH || DEFAULT_BRANCH
  const token = process.env.DOCS_ADMIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''

  return { repository, branch, token }
}

function safeDecodeBase64(value: string) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function normalizePath(path: string) {
  return path.replace(/^\/+/, '').replace(/\\/g, '/')
}

export function isAllowedDocsAdminPath(path: string) {
  const normalized = normalizePath(path)

  return (
    !normalized.includes('../') &&
    (normalized.startsWith(`${DOCS_ROOT}/`) ||
      normalized.startsWith(`${IMAGE_ROOT}/`) ||
      normalized === SITE_CONTENT_PATH)
  )
}

export function getDocsAdminSetup() {
  const config = getGitHubConfig()

  return {
    repository: config.repository,
    branch: config.branch,
    canPublish: Boolean(config.token),
    contentRoot: DOCS_ROOT,
    imageRoot: IMAGE_ROOT,
    siteContentPath: SITE_CONTENT_PATH,
  }
}

async function githubRequest<T>(path: string, init: RequestInit = {}) {
  const { repository, token } = getGitHubConfig()
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/vnd.github+json')
  headers.set('X-GitHub-Api-Version', '2022-11-28')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub request failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  return (await response.json()) as T
}

async function getBranchRef() {
  const { branch } = getGitHubConfig()

  return githubRequest<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`)
}

async function getCommit(sha: string) {
  return githubRequest<{ tree: { sha: string } }>(`/git/commits/${sha}`)
}

async function createBlob(content: string, encoding: 'utf-8' | 'base64') {
  return githubRequest<{ sha: string }>('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({
      content,
      encoding: encoding === 'base64' ? 'base64' : 'utf-8',
    }),
  })
}

export async function getRepositoryTree() {
  const { branch } = getGitHubConfig()
  const tree = await githubRequest<GitTreeResponse>(`/git/trees/${encodeURIComponent(branch)}?recursive=1`)

  return tree.tree
}

export async function getTextFile(path: string) {
  if (!isAllowedDocsAdminPath(path)) {
    throw new Error('Path is outside the editable docs area.')
  }

  const { branch } = getGitHubConfig()
  const data = await githubRequest<{ content: string; encoding: string; path: string; sha: string }>(
    `/contents/${normalizePath(path)}?ref=${encodeURIComponent(branch)}`,
  )

  return {
    path: data.path,
    sha: data.sha,
    content: safeDecodeBase64(data.content.replace(/\n/g, '')),
  }
}

export async function commitDocsChanges({
  message,
  files,
  deletions,
}: {
  message: string
  files: GitHubFileChange[]
  deletions?: GitHubDeleteChange[]
}) {
  const { branch, token } = getGitHubConfig()

  if (!token) {
    throw new Error('DOCS_ADMIN_GITHUB_TOKEN or GITHUB_TOKEN is required to publish changes.')
  }

  const normalizedFiles = files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
    encoding: file.encoding || 'utf-8',
  }))
  const normalizedDeletions = (deletions || []).map((file) => ({
    path: normalizePath(file.path),
  }))

  for (const change of [...normalizedFiles, ...normalizedDeletions]) {
    if (!isAllowedDocsAdminPath(change.path)) {
      throw new Error(`Cannot edit path outside docs admin scope: ${change.path}`)
    }
  }

  const ref = await getBranchRef()
  const parentSha = ref.object.sha
  const parentCommit = await getCommit(parentSha)

  const treeEntries = []

  for (const file of normalizedFiles) {
    const blob = await createBlob(file.content, file.encoding)
    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  for (const file of normalizedDeletions) {
    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: null,
    })
  }

  const tree = await githubRequest<{ sha: string }>('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: treeEntries,
    }),
  })

  const commit = await githubRequest<{ sha: string; html_url?: string }>('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [parentSha],
    }),
  })

  await githubRequest(`/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: commit.sha,
      force: false,
    }),
  })

  return {
    branch,
    sha: commit.sha,
  }
}

export function getEditableDocsPaths(entries: GitTreeEntry[]) {
  const blobs = entries.filter((entry) => entry.type === 'blob')
  const docs = blobs
    .filter((entry) => entry.path.startsWith(`${DOCS_ROOT}/`) && /\.(mdx|md)$/i.test(entry.path))
    .map((entry) => entry.path)
    .sort()
  const metaFiles = blobs
    .filter((entry) => entry.path.startsWith(`${DOCS_ROOT}/`) && entry.path.endsWith('/meta.json'))
    .map((entry) => entry.path)
    .sort()
  const images = blobs
    .filter((entry) => entry.path.startsWith(`${IMAGE_ROOT}/`))
    .map((entry) => entry.path)
    .sort()

  return { docs, metaFiles, images }
}
