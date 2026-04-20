import { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function Home() {
  const [repos, setRepos] = useState([])

  useEffect(() =&gt; {
    fetch('https://api.github.com/orgs/The-Interdependency/repos?per_page=100')
      .then(res =&gt; res.json())
      .then(data =&gt; setRepos(data.filter(repo =&gt; !repo.archived)))
      .catch(err =&gt; console.error('Error fetching repos:', err))
  }, [])

  return (
    &lt;div className=&quot;home&quot;&gt;
      &lt;h1&gt;The Interdependent Way Repositories&lt;/h1&gt;
      &lt;p&gt;Explore projects under The-Interdependency organization.&lt;/p&gt;
      &lt;div className=&quot;repo-grid&quot;&gt;
        {repos.map(repo =&gt; (
          &lt;Link key={repo.name} to={`/repo/${repo.name}`} className=&quot;repo-card&quot;&gt;
            &lt;img src={`https://ghchart.rshah.org/${repo.name}`} alt={repo.name} width=&quot;200&quot; /&gt; // Placeholder chart as image
            &lt;h2&gt;{repo.name}&lt;/h2&gt;
            &lt;p&gt;{repo.description || 'No description available'}&lt;/p&gt;
            &lt;p&gt;Language: {repo.language || 'N/A'} | Stars: {repo.stargazers_count}&lt;/p&gt;
          &lt;/Link&gt;
        ))}
      &lt;/div&gt;
      &lt;Link to=&quot;/canon&quot;&gt;&lt;button&gt;a0 Explains the Interdependent Way&lt;/button&gt;&lt;/Link&gt;
    &lt;/div&gt;
  )
}

function RepoDetails() {
  const { repoName } = useParams()
  const [readme, setReadme] = useState('')
  const [loading, setLoading] = useState(true)
  const [claudeMd, setClaudeMd] = useState('') // Assuming claude.md for explanations

  useEffect(() =&gt; {
    // Fetch README.md
    fetch(`https://api.github.com/repos/The-Interdependency/${repoName}/readme`)
      .then(res =&gt; res.json())
      .then(data =&gt; {
        const decoded = atob(data.content)
        setReadme(decoded)
        setLoading(false)
      })
      .catch(err =&gt; {
        console.error('Error fetching README:', err)
        setLoading(false)
      })

    // Fetch claude.md if exists (placeholder; adjust path if per-repo file)
    fetch(`https://api.github.com/repos/The-Interdependency/${repoName}/contents/claude.md`)
      .then(res =&gt; res.json())
      .then(data =&gt; {
        if (data.content) {
          const decoded = atob(data.content)
          setClaudeMd(decoded)
        }
      })
      .catch(() =&gt; setClaudeMd('No claude.md found; explanations forthcoming.'))
  }, [repoName])

  if (loading) return &lt;p&gt;Loading {repoName}...&lt;/p&gt;

  return (
    &lt;div className=&quot;repo-details&quot;&gt;
      &lt;Link to=&quot;/&quot;&gt;Back to Home&lt;/Link&gt;
      &lt;h1&gt;{repoName}&lt;/h1&gt;
      &lt;h2&gt;README.md&lt;/h2&gt;
      &lt;ReactMarkdown remarkPlugins={[remarkGfm]}&gt;{readme}&lt;/ReactMarkdown&gt;
      &lt;h2&gt;Explanations (claude.md)&lt;/h2&gt;
      &lt;ReactMarkdown remarkPlugins={[remarkGfm]}&gt;{claudeMd}&lt;/ReactMarkdown&gt;
    &lt;/div&gt;
  )
}

function CanonPage() {
  const [canon, setCanon] = useState('')
  const [explanation, setExplanation] = useState('')

  useEffect(() =&gt; {
    // Fetch canon from wayseer00/main
    fetch('https://api.github.com/repos/wayseer00/main/contents/canon/INTERDEPENDENT_WAY.txt')
      .then(res =&gt; res.json())
      .then(data =&gt; {
        const decoded = atob(data.content)
        setCanon(decoded)
      })

    // Fetch explanations from site repo
    fetch('https://raw.githubusercontent.com/wayseer00/wayseer.github.io/main/a0-explains-interdependent-way.md')
      .then(res =&gt; res.text())
      .then(text =&gt; setExplanation(text))
      .catch(() =&gt; setExplanation('Explanations loading...'))
  }, [])

  return (
    &lt;div className=&quot;canon-page&quot;&gt;
      &lt;Link to=&quot;/&quot;&gt;Back to Home&lt;/Link&gt;
      &lt;h1&gt;a0 Explains the Interdependent Way&lt;/h1&gt;
      &lt;h2&gt;Full Canon Text&lt;/h2&gt;
      &lt;ReactMarkdown remarkPlugins={[remarkGfm]}&gt;{canon}&lt;/ReactMarkdown&gt;
      &lt;h2&gt;Explanations and Citations&lt;/h2&gt;
      &lt;ReactMarkdown remarkPlugins={[remarkGfm]}&gt;{explanation}&lt;/ReactMarkdown&gt;
    &lt;/div&gt;
  )
}

export default function App() {
  return (
    &lt;div className=&quot;App&quot;&gt;
      &lt;Routes&gt;
        &lt;Route path=&quot;/&quot; element={&lt;Home /&gt;} /&gt;
        &lt;Route path=&quot;/repo/:repoName&quot; element={&lt;RepoDetails /&gt;} /&gt;
        &lt;Route path=&quot;/canon&quot; element={&lt;CanonPage /&gt;} /&gt;
      &lt;/Routes&gt;
    &lt;/div&gt;
  )
}