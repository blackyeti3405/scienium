export default async function BattlePage(props: { params: Promise<{ id: string }> }) {
  await props.params // Next 15: params is a Promise (unused until BattleScreen lands)
  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      {/* TODO: BattleScreen component */}
    </div>
  )
}
