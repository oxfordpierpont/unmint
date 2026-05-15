import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/secure-login')
}
