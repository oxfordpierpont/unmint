import { NextRequest, NextResponse } from 'next/server'
import { requireDocsAdmin } from '@/lib/admin/access'
import { commitDocsChanges } from '@/lib/admin/github-docs'

export const dynamic = 'force-dynamic'

type PublishFile = {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

type PublishPayload = {
  message?: string
  files?: PublishFile[]
  deletions?: { path: string }[]
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireDocsAdmin()

  if (response) {
    return response
  }

  let payload: PublishPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const files = payload.files || []
  const deletions = payload.deletions || []

  if (files.length === 0 && deletions.length === 0) {
    return NextResponse.json({ error: 'No changes to publish.' }, { status: 400 })
  }

  try {
    const result = await commitDocsChanges({
      message: payload.message || `Update docs from admin (${user?.email})`,
      files,
      deletions,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not publish docs changes.' },
      { status: 500 },
    )
  }
}
