import { NextResponse } from 'next/server'
import { requireDocsAdmin } from '@/lib/admin/access'
import { getDocsAdminSetup, getEditableDocsPaths, getRepositoryTree, getTextFile } from '@/lib/admin/github-docs'

export const dynamic = 'force-dynamic'

async function readJsonFile(path: string) {
  try {
    const file = await getTextFile(path)
    return JSON.parse(file.content)
  } catch {
    return null
  }
}

export async function GET() {
  const { response } = await requireDocsAdmin()

  if (response) {
    return response
  }

  try {
    const tree = await getRepositoryTree()
    const paths = getEditableDocsPaths(tree)
    const metaEntries = await Promise.all(
      paths.metaFiles.map(async (path) => ({
        path,
        content: await readJsonFile(path),
      })),
    )
    const siteContent = await readJsonFile(getDocsAdminSetup().siteContentPath)

    return NextResponse.json({
      setup: getDocsAdminSetup(),
      docs: paths.docs,
      metaFiles: metaEntries,
      images: paths.images,
      siteContent,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load docs admin data.' },
      { status: 500 },
    )
  }
}
