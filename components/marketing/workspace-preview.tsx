import { Badge } from "@/components/ui";

export function WorkspacePreview() {
  return (
    <div className="hero-visual">
      <div className="hero-decoration" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
      </div>
      <div className="floating-note">
        <span className="note-icon" aria-hidden="true">
          ▥
        </span>
        <div>
          <small>Your next step</small>
          <strong>Make ideas work.</strong>
        </div>
      </div>
      <figure className="workspace">
        <figcaption>
          <span>
            <span className="mini-logo" aria-hidden="true">
              N
            </span>{" "}
            Learning workspace
          </span>
          <Badge>Concept preview</Badge>
        </figcaption>
        <div className="workspace-body">
          <aside aria-label="Preview sections">
            <span className="selected">
              ▤ <span>Learn</span>
            </span>
            <span>
              ◇ <span>Projects</span>
            </span>
            <span>
              ✧ <span>AI tutor</span>
            </span>
            <span>
              ▥ <span>Progress</span>
            </span>
            <small>
              Small steps.
              <br />
              Real possibilities.
            </small>
          </aside>
          <div className="preview-lesson">
            <p className="eyebrow">JAVASCRIPT FOUNDATIONS</p>
            <h3>
              A little practice.
              <br />A new perspective.
            </h3>
            <p className="preview-subtitle">
              An example of the planned lesson experience
            </p>
            <div className="code-window">
              <div className="code-title">
                <span>arrays.js</span>
                <span>JavaScript</span>
              </div>
              <pre>
                <code>
                  <span className="code-purple">const</span> numbers = [1, 2, 3,
                  4];{"\n\n"}
                  <span className="code-purple">const</span> doubled = numbers.
                  <span className="code-cyan">map</span>({"\n"} number =&gt;
                  number * 2{"\n"});
                </code>
              </pre>
            </div>
            <div className="output">
              <small>EXAMPLE OUTPUT</small>
              <code>[2, 4, 6, 8]</code>
              <span aria-hidden="true">✓</span>
            </div>
          </div>
        </div>
        <div className="preview-foot">
          <span className="status-dot" />
          Illustrative fixture · no code execution or saved progress
        </div>
      </figure>
      <div className="floating-note note-bottom">
        <span className="check-circle" aria-hidden="true">
          ✓
        </span>
        <div>
          <small>Learn it. Practise it.</small>
          <strong>Build something real.</strong>
        </div>
      </div>
    </div>
  );
}
