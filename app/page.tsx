import { Badge, Brand, ButtonLink, Card } from "@/components/ui";
import { Header } from "@/components/marketing/header";
import { WorkspacePreview } from "@/components/marketing/workspace-preview";

const paths = [
  {
    name: "JavaScript foundations",
    description: "From first functions to working ideas.",
    theme: "cubes",
    tag: "Beginner friendly",
    detail:
      "Start with values and functions, then explore arrays and problem solving. This is the proposed first course; reviewed lessons and enrolment arrive in Phase 3.",
  },
  {
    name: "AI essentials",
    description: "Understand, evaluate, and use AI.",
    theme: "waves",
    tag: "Future learning path",
    detail:
      "A proposed expansion covering AI fundamentals and thoughtful evaluation. This path is not available yet; timing follows the JavaScript pilot.",
  },
  {
    name: "Web development",
    description: "Build experiences for the modern web.",
    theme: "landscape",
    tag: "Future learning path",
    detail:
      "A proposed expansion into accessible, responsive web experiences. This path is not available yet; timing follows the JavaScript pilot.",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section className="container hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <Badge>
              <span aria-hidden="true">✦</span> A brighter way to learn
            </Badge>
            <h1 id="hero-title">
              Understand deeply.
              <br />
              <span className="gradient-text">Build confidently.</span>
              <br />
              Keep moving forward.
            </h1>
            <p className="hero-description">
              A clearer learning path, thoughtful guidance, and hands-on
              projects. Turn what you learn into skills you can use.
            </p>
            <div className="hero-actions">
              <ButtonLink href="#learning-paths">
                Explore learning paths <span aria-hidden="true">→</span>
              </ButtonLink>
              <ButtonLink href="#how-it-works" secondary>
                <span aria-hidden="true">▷</span> See how it works
              </ButtonLink>
            </div>
            <p className="quiet hero-caption">
              Learn at your pace. Practise with purpose.
            </p>
            <p className="preview-label">
              Early preview · learning features are coming soon
            </p>
          </div>
          <WorkspacePreview />
        </section>
        <section
          id="how-it-works"
          className="container section"
          aria-labelledby="how-title"
        >
          <p className="eyebrow">SMALL STEPS. LASTING UNDERSTANDING.</p>
          <h2 id="how-title">A clearer path from curiosity to capability.</h2>
          <div className="feature-grid">
            <Card>
              <div className="feature-heading">
                <span className="feature-icon" aria-hidden="true">
                  ⌘
                </span>
                <h3>A path with purpose</h3>
              </div>
              <p>
                Start with the foundations. Connect each new concept to what you
                already know.
              </p>
              <div className="path-diagram" aria-hidden="true">
                <span>✓</span>
                <span className="current">2</span>
                <span>3</span>
                <span>4</span>
              </div>
              <small>Planned · guided paths in Phase 3</small>
            </Card>
            <Card>
              <div className="feature-heading">
                <span className="feature-icon" aria-hidden="true">
                  ✧
                </span>
                <h3>A tutor beside you</h3>
              </div>
              <p>
                Hints that invite you to think. Explanations that help the
                pieces fall into place.
              </p>
              <div className="tutor-demo">
                <div className="tutor-orb" aria-hidden="true">
                  ••
                </div>
                <blockquote>
                  “What do you notice about each number?”
                  <small>Illustrative tutor hint</small>
                </blockquote>
              </div>
              <small>Planned · AI guidance in Phase 4</small>
            </Card>
            <Card>
              <div className="feature-heading">
                <span className="feature-icon" aria-hidden="true">
                  ◇
                </span>
                <h3>Skills you can demonstrate</h3>
              </div>
              <p>
                Put ideas into practice, build useful projects, and see how far
                you have come.
              </p>
              <ul className="check-list">
                <li>Understand the concept</li>
                <li>Try it for yourself</li>
                <li>Make it your own</li>
              </ul>
              <small>Planned · projects in Phase 5</small>
            </Card>
          </div>
        </section>
        <section
          id="learning-paths"
          className="container section"
          aria-labelledby="paths-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">FOLLOW YOUR CURIOSITY</p>
              <h2 id="paths-title">What will you build next?</h2>
            </div>
            <Badge>Catalogue preview</Badge>
          </div>
          <div className="path-grid">
            {paths.map((path) => (
              <Card className="course-card" key={path.name}>
                <div className={`course-art ${path.theme}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="course-content">
                  <h3>{path.name}</h3>
                  <p>{path.description}</p>
                  <Badge>
                    <span className="status-dot" />
                    {path.tag}
                  </Badge>
                  <details>
                    <summary>
                      Preview this path <span aria-hidden="true">↗</span>
                    </summary>
                    <p>{path.detail}</p>
                  </details>
                </div>
              </Card>
            ))}
          </div>
        </section>
        <section
          id="projects"
          className="container project-section"
          aria-labelledby="projects-title"
        >
          <div>
            <p className="eyebrow">KNOWLEDGE, MEET POSSIBILITY</p>
            <h2 id="projects-title">Make something that matters to you.</h2>
            <p>
              Practise with a task manager, then connect the dots in a weather
              app. Planned projects will turn small lessons into tangible work.
            </p>
          </div>
          <div className="project-examples">
            <span>
              <span aria-hidden="true">☑</span> Interactive task manager
            </span>
            <span>
              <span aria-hidden="true">☀</span> API-powered weather app
            </span>
            <small>Project briefs and submissions arrive in Phase 5.</small>
          </div>
        </section>
        <section
          id="availability"
          className="container availability"
          aria-labelledby="availability-title"
        >
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h2 id="availability-title">
              Every breakthrough starts with one step.
            </h2>
            <p>
              You’re exploring an early version. Set a learning goal and make
              room for your next step. Accounts are available when this
              environment is connected; lessons and saved progress arrive in
              Phase 3.
            </p>
          </div>
          <ButtonLink href="/register">
            Create your learning space <span aria-hidden="true">→</span>
          </ButtonLink>
        </section>
        <section className="container about section" id="about">
          <details>
            <summary>About this preview</summary>
            <p>
              Nexus Learning is being built for adult and college learners,
              beginning with JavaScript. The examples above are illustrative,
              not live courses or learner results. Accounts require a connected
              environment. There are no payments, analytics, or AI requests.
              Public privacy notices and support channels will be reviewed
              before beta.
            </p>
          </details>
        </section>
      </main>
      <footer className="container footer">
        <Brand />
        <nav aria-label="Footer navigation">
          <a href="#about">About this preview</a>
          <a href="#availability">Availability</a>
          <a href="#main-content">Back to top ↑</a>
        </nav>
        <small>
          A brighter you.
          <br />A more capable tomorrow.
        </small>
      </footer>
    </>
  );
}
