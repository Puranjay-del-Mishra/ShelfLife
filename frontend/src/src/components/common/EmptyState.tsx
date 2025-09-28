// auto-stub created
export function EmptyState({ title='Nothing here', cta }: { title?: string; cta?: React.ReactNode }){
  return <div className="text-center p-8 text-gray-500">{title}{cta && <div className="mt-3">{cta}</div>}</div>
}
