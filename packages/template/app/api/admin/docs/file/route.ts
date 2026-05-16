import { NextRequest, NextResponse } from 'next/server'
import { requireDocsAdmin } from '@/lib/admin/access'
import { getTextFile } from '@/lib/admin/github-docs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { response } = await requireDocsAdmin()

  if (response) {
    return response
  }

  const path = request.nextUrl.searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'Missing path.' }, { status: 400 })
  }

  try {
    const file = await getTextFile(path)
    return NextResponse.json(file)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load file.' },
      { status: 500 },
    )
  }
}
