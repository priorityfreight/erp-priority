import { LoginScreen } from "@/components/auth/LoginScreen"

type LoginPageProps = {
  searchParams?: Promise<{
    reason?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}

  return <LoginScreen reason={params.reason} />
}
