import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PROJECT_PAGES } from '../../data'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PROJECT_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = PROJECT_PAGES.find((p) => p.slug === slug)
  return project ? { title: project.name, description: project.description } : {}
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const project = PROJECT_PAGES.find((p) => p.slug === slug)
  if (!project) {
    notFound()
  }

  const sections = [
    { heading: 'What did I do?', body: project.what },
    { heading: 'Why did I do it?', body: project.why },
    { heading: 'What mistakes did I make?', body: project.mistakes },
    { heading: 'What would I have done differently if I could go back in time?', body: project.differently },
  ]

  return (
    <main className="space-y-8 pb-16">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-900 dark:ring-zinc-800/50">
        {project.gif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.gif} alt={`${project.name} demo`} className="h-full w-full object-cover" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
            Demo coming soon
          </p>
        )}
      </div>

      <section>
        <h1 className="text-2xl font-medium text-zinc-900 dark:text-zinc-50">{project.name}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{project.description}</p>
        <a
          href={project.github}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          View on GitHub
        </a>
      </section>

      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">{s.heading}</h2>
          <p className="text-zinc-600 dark:text-zinc-400">{s.body}</p>
        </section>
      ))}
    </main>
  )
}
