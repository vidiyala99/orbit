/** Instant Home shell while the ranked queue loads: header, rail, badge and dock placeholders. */
export default function HomeLoading() {
  return (
    <div className="badge-world bw-page" aria-busy="true" aria-label="Loading your event">
      <div className="bw-home">
        <header className="bw-header">
          <div className="bw-header-top">
            <span className="bw-wordmark">Actintro</span>
          </div>
          <div className="bw-header-main">
            <div className="bw-skeleton h-7 w-56 rounded" />
            <div className="bw-header-row">
              <div className="bw-skeleton h-4 w-20 rounded" />
            </div>
          </div>
        </header>
        <div className="bw-rail relative">
          <div aria-hidden="true" className="bw-lanyard absolute inset-x-0 top-0" />
          <div className="bw-rail-list relative flex overflow-hidden">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center">
                <span aria-hidden="true" className="bw-mini-clip" />
                <span className="bw-mini-hit">
                  <span className="bw-mini-badge bw-skeleton" />
                </span>
              </div>
            ))}
          </div>
        </div>
        <main className="bw-main">
          <div className="bw-card-stage">
            <span aria-hidden="true" className="bw-clip" />
            <div className="bw-card">
              <div className="bw-card-inner">
                <div className="bw-face bw-skeleton-card" />
              </div>
            </div>
          </div>
          <div className="bw-dock">
            <div className="bw-skeleton h-12 rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
