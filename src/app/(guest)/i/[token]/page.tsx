export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <p className="p-10">Invitación {token.slice(0, 4)}…</p>
}
